import type { EngagementClass, ModelType } from '../types/classsight';

export interface PoseFeatures {
  headYawDeg: number;
  headPitchDeg: number;
  headRollDeg: number;
  torsoLeanDeg: number;
  isSlouching: boolean;
  handRaised: boolean;
  gazeBoardScore: number; // 0..1 proxy from head orientation
  shoulderSymmetry: number; // 0..1
}

export interface ClassificationOutput {
  engagementClass: EngagementClass;
  confidence: number;
  isUncertain: boolean;
  probabilities: {
    Attentive: number;
    Distracted: number;
    Participating: number;
  };
}

const WINDOW_SIZE = 10; // 2.0 seconds at 5 FPS
const UNCERTAINTY_THRESHOLD = 0.58;

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-Math.max(-15, Math.min(15, x))));
}

function softmax(logits: [number, number, number]): [number, number, number] {
  const m = Math.max(...logits);
  const exps = logits.map((v) => Math.exp(v - m));
  const sum = exps[0] + exps[1] + exps[2];
  return [exps[0] / sum, exps[1] / sum, exps[2] / sum];
}

function toVector(f: PoseFeatures): number[] {
  return [
    Math.max(-1, Math.min(1, f.headYawDeg / 45)),
    Math.max(-1, Math.min(1, f.headPitchDeg / 45)),
    Math.max(-1, Math.min(1, f.headRollDeg / 30)),
    Math.max(-1, Math.min(1, f.torsoLeanDeg / 30)),
    f.isSlouching ? 1 : 0,
    f.handRaised ? 1 : 0,
    Math.max(0, Math.min(1, f.gazeBoardScore)),
    Math.max(0, Math.min(1, f.shoulderSymmetry)),
  ];
}

export class TemporalEngagementClassifier {
  private windows = new Map<string, number[][]>();

  reset() {
    this.windows.clear();
  }

  private pushWindow(trackId: string, vec: number[]): number[][] {
    const existing = this.windows.get(trackId) ?? [];
    const next = [...existing, vec];
    if (next.length > WINDOW_SIZE) {
      next.shift();
    }
    this.windows.set(trackId, next);
    return next;
  }

  classify(trackId: string, features: PoseFeatures, modelType: ModelType): ClassificationOutput {
    const vec = toVector(features);
    const seq = this.pushWindow(trackId, vec);

    // Exponentially weighted temporal smoothing across the sliding window
    let weightSum = 0;
    const smoothed = new Array(8).fill(0);
    seq.forEach((frameVec, i) => {
      const w = 0.5 + (0.5 * (i + 1)) / seq.length;
      weightSum += w;
      for (let k = 0; k < 8; k++) {
        smoothed[k] += frameVec[k] * w;
      }
    });
    for (let k = 0; k < 8; k++) {
      smoothed[k] /= weightSum;
    }

    const absYaw = Math.abs(smoothed[0] * 45);
    const absPitch = Math.abs(smoothed[1] * 45);
    const slouch = smoothed[4];
    const hand = smoothed[5];
    const gazeBoard = smoothed[6];

    // Baseline Classifier (Feature-engineered logistic scoring over smoothed window)
    const zAttentive = 2.1 * gazeBoard - 0.045 * absYaw - 0.03 * Math.max(0, absPitch - 12) - 0.9 * slouch - 0.65 * hand;
    const zDistracted = 0.065 * Math.max(0, absYaw - 17) + 0.055 * Math.max(0, absPitch - 16) + 1.45 * slouch - 1.15 * gazeBoard;
    const zParticipating = 3.4 * hand + 0.65 * gazeBoard - 0.45 * slouch;

    let probs = softmax([zAttentive, zDistracted, zParticipating]);

    if (modelType === 'lstm') {
      // Real LSTM cell forward pass (hidden_dim = 4, input_dim = 8) over the sliding window
      // Uses structured prototype weights aligned with pose/gaze temporal dynamics
      let h = [0, 0, 0, 0];
      let c = [0, 0, 0, 0];

      for (const x of seq) {
        // Gate pre-activations combining input x[0..7] and previous hidden h[0..3]
        const forgetRaw = [
          0.9 + 0.4 * h[0],
          0.9 + 0.4 * h[1],
          0.85 + 0.35 * h[2],
          0.85 + 0.35 * h[3],
        ];
        const inputRaw = [
          1.4 * x[6] - 0.8 * Math.abs(x[0]) - 0.6 * x[4] + 0.3 * h[0], // Attentive unit
          1.3 * Math.abs(x[0]) + 1.1 * Math.abs(x[1]) + 1.2 * x[4] - 1.0 * x[6] + 0.3 * h[1], // Distracted unit
          2.6 * x[5] + 0.5 * x[6] + 0.3 * h[2], // Participating unit
          0.5 * x[7] - 0.4 * Math.abs(x[2]) + 0.2 * h[3], // Stability unit
        ];
        const candRaw = [
          1.6 * x[6] - 0.9 * Math.abs(x[0]) - 0.7 * x[4],
          1.5 * Math.abs(x[0]) + 1.2 * x[4] - 1.1 * x[6],
          2.8 * x[5] + 0.4 * x[6],
          0.6 * x[7] - 0.5 * Math.abs(x[3]),
        ];
        const outRaw = [0.8 + 0.3 * h[0], 0.8 + 0.3 * h[1], 0.9 + 0.3 * h[2], 0.7 + 0.2 * h[3]];

        const nextH = [0, 0, 0, 0];
        const nextC = [0, 0, 0, 0];
        for (let u = 0; u < 4; u++) {
          const fGate = sigmoid(forgetRaw[u]);
          const iGate = sigmoid(inputRaw[u]);
          const gCand = Math.tanh(candRaw[u]);
          const oGate = sigmoid(outRaw[u]);
          nextC[u] = fGate * c[u] + iGate * gCand;
          nextH[u] = oGate * Math.tanh(nextC[u]);
        }
        c = nextC;
        h = nextH;
      }

      const lstmLogits: [number, number, number] = [
        2.4 * h[0] + 0.6 * h[3] - 0.8 * h[1] - 0.5 * h[2],
        2.3 * h[1] - 1.2 * h[0] - 0.7 * h[2],
        3.1 * h[2] + 0.4 * h[0] - 0.4 * h[1],
      ];
      const lstmProbs = softmax(lstmLogits);
      probs = [
        probs[0] * 0.35 + lstmProbs[0] * 0.65,
        probs[1] * 0.35 + lstmProbs[1] * 0.65,
        probs[2] * 0.35 + lstmProbs[2] * 0.65,
      ];
    }

    const classes: Array<'Attentive' | 'Distracted' | 'Participating'> = [
      'Attentive',
      'Distracted',
      'Participating',
    ];
    let bestIdx = 0;
    if (probs[1] > probs[bestIdx]) bestIdx = 1;
    if (probs[2] > probs[bestIdx]) bestIdx = 2;

    const confidence = Number(probs[bestIdx].toFixed(3));
    const isUncertain = confidence < UNCERTAINTY_THRESHOLD;
    const engagementClass: EngagementClass = isUncertain ? 'Uncertain' : classes[bestIdx];

    return {
      engagementClass,
      confidence,
      isUncertain,
      probabilities: {
        Attentive: Number(probs[0].toFixed(3)),
        Distracted: Number(probs[1].toFixed(3)),
        Participating: Number(probs[2].toFixed(3)),
      },
    };
  }
}
