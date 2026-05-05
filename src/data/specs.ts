/**
 * 硬件 / 模型 / 集群规格常量。
 *
 * 每个数字都标注来源 URL 或论文，用于 UI 中的 citation popover，确保数据可追溯。
 * 命名约定：所有带宽 = 双向（bidirectional），单位以 GB/s / TB/s 为主；
 *           所有内存容量 = GB；所有 token = tokens。
 *
 * i18n 说明：`note` 字段保存翻译 key（例如 'specs.B200.hbmCapacity.note'）；
 *           causeBreakdown[].cause 也是翻译 key（'specs.cause.faultyGPU' 等）。
 *           其他字段（label, url, value, unit）保持原值。
 */

export interface Source {
  /** 简短引用标签，例如 "NVIDIA GB200 NVL72 Datasheet" */
  label: string
  /** 来源 URL */
  url: string
}

export interface Spec<T = number> {
  value: T
  /** 单位字符串，例如 "GB/s" */
  unit?: string
  /** 翻译 key：简短人类可读描述 */
  note?: string
  /** 参考来源数组 */
  sources: Source[]
}

const NV_GB200_DS: Source = {
  label: 'NVIDIA GB200 NVL72 product page',
  url: 'https://www.nvidia.com/en-us/data-center/gb200-nvl72/',
}
const NV_DGX_SUPERPOD_GB200: Source = {
  label: 'NVIDIA DGX SuperPOD GB200 Reference Architecture',
  url: 'https://docs.nvidia.com/dgx-superpod/reference-architecture-scalable-infrastructure-gb200/latest/dgx-superpod-components.html',
}
const NV_MULTINODE_TUNING: Source = {
  label: 'NVIDIA GB200 NVL Multi-Node Tuning Guide',
  url: 'https://docs.nvidia.com/multi-node-nvlink-systems/multi-node-tuning-guide/overview.html',
}
const LLAMA3_PAPER: Source = {
  label: 'The Llama 3 Herd of Models (Meta, 2024)',
  url: 'https://arxiv.org/abs/2407.21783',
}
const DEEPSEEK_V3_PAPER: Source = {
  label: 'DeepSeek-V3 Technical Report',
  url: 'https://arxiv.org/abs/2412.19437',
}
const SCALING_LAWS_ROUTED: Source = {
  label: 'Unified Scaling Laws for Routed Language Models (Clark et al.)',
  url: 'https://arxiv.org/abs/2202.01169',
}
const MEGASCALE_PAPER: Source = {
  label: 'MegaScale: Scaling LLM Training to More Than 10K GPUs (NSDI 24)',
  url: 'https://www.usenix.org/conference/nsdi24/presentation/jiang-ziheng',
}
const ACME_PAPER: Source = {
  label:
    'Characterization of Large Language Model Development in the Datacenter (NSDI 24)',
  url: 'https://www.usenix.org/conference/nsdi24/presentation/hu',
}
const GEMINI_PAPER: Source = {
  label: 'GEMINI: Fast Failure Recovery in Distributed Training (SOSP 23)',
  url: 'https://dl.acm.org/doi/10.1145/3600006.3613145',
}
const RECYCLE_PAPER: Source = {
  label: 'ReCycle: Resilient Training of Large DNNs (SOSP 24)',
  url: 'https://dl.acm.org/doi/10.1145/3694715.3695964',
}
const SCALING_BOOK: Source = {
  label: 'How to Scale Your Model (Google JAX)',
  url: 'https://jax-ml.github.io/scaling-book/',
}
const TOMSHW_LLAMA3: Source = {
  label: "Tom's Hardware: Llama 3 training failure breakdown",
  url: 'https://www.tomshardware.com/tech-industry/artificial-intelligence/faulty-nvidia-h100-gpus-and-hbm3-memory-caused-half-of-the-failures-during-llama-3-training-one-failure-every-three-hours-for-metas-16384-gpu-training-cluster',
}

// ---------- Blackwell B200 GPU ----------
export const BlackwellB200 = {
  reticleDies: {
    value: 2,
    sources: [NV_MULTINODE_TUNING],
    note: 'specs.B200.reticleDies.note',
  } satisfies Spec,
  dieToDieBandwidth: {
    value: 10,
    unit: 'TB/s',
    note: 'specs.B200.dieToDie.note',
    sources: [NV_MULTINODE_TUNING],
  } satisfies Spec,
  hbmCapacityGB: {
    value: 192,
    unit: 'GB',
    note: 'specs.B200.hbmCapacity.note',
    sources: [NV_GB200_DS, NV_DGX_SUPERPOD_GB200],
  } satisfies Spec,
  hbmBandwidthTBs: {
    value: 8,
    unit: 'TB/s',
    note: 'specs.B200.hbmBandwidth.note',
    sources: [NV_GB200_DS],
  } satisfies Spec,
  fp4DenseTFLOPS: {
    value: 10000,
    unit: 'TFLOPS (FP4 dense)',
    note: 'specs.B200.fp4.note',
    sources: [NV_GB200_DS],
  } satisfies Spec,
  nvlinkPortsPerGPU: {
    value: 18,
    unit: 'links',
    note: 'specs.B200.nvlinkPorts.note',
    sources: [NV_DGX_SUPERPOD_GB200],
  } satisfies Spec,
  nvlinkBandwidthPerGPU: {
    value: 1.8,
    unit: 'TB/s',
    note: 'specs.B200.nvlinkBw.note',
    sources: [NV_DGX_SUPERPOD_GB200],
  } satisfies Spec,
}

// ---------- GB200 NVL72 Rack ----------
export const NVL72 = {
  computeTrays: {
    value: 18,
    note: 'specs.NVL72.computeTrays.note',
    sources: [NV_DGX_SUPERPOD_GB200],
  } satisfies Spec,
  superchipsPerTray: {
    value: 2,
    note: 'specs.NVL72.superchipsPerTray.note',
    sources: [NV_DGX_SUPERPOD_GB200],
  } satisfies Spec,
  gpusPerSuperchip: {
    value: 2,
    note: 'specs.NVL72.gpusPerSuperchip.note',
    sources: [NV_MULTINODE_TUNING],
  } satisfies Spec,
  gracesPerSuperchip: {
    value: 1,
    sources: [NV_MULTINODE_TUNING],
  } satisfies Spec,
  totalGPUs: {
    value: 72,
    note: 'specs.NVL72.totalGPUs.note',
    sources: [NV_GB200_DS],
  } satisfies Spec,
  totalGraces: {
    value: 36,
    sources: [NV_GB200_DS],
  } satisfies Spec,
  nvSwitchTrays: {
    value: 9,
    note: 'specs.NVL72.nvSwitchTrays.note',
    sources: [NV_DGX_SUPERPOD_GB200],
  } satisfies Spec,
  cx7NicsPerTray: {
    value: 4,
    note: 'specs.NVL72.cx7Nics.note',
    sources: [NV_DGX_SUPERPOD_GB200],
  } satisfies Spec,
  ibBandwidthPerNic: {
    value: 400,
    unit: 'Gb/s',
    note: 'specs.NVL72.ibBwPerNic.note',
    sources: [NV_DGX_SUPERPOD_GB200],
  } satisfies Spec,
  scaleUpTotalBandwidth: {
    value: 130,
    unit: 'TB/s',
    note: 'specs.NVL72.scaleUp.note',
    sources: [NV_GB200_DS],
  } satisfies Spec,
  rackPowerKW: {
    value: 120,
    unit: 'kW',
    note: 'specs.NVL72.power.note',
    sources: [NV_GB200_DS],
  } satisfies Spec,
  totalHBMTB: {
    value: 13.5,
    unit: 'TB',
    note: 'specs.NVL72.totalHBM.note',
    sources: [NV_GB200_DS],
  } satisfies Spec,
  totalHBMBandwidthPBs: {
    value: 576,
    unit: 'TB/s',
    note: 'specs.NVL72.totalHBMBw.note',
    sources: [NV_GB200_DS],
  } satisfies Spec,
}

// ---------- Roofline / 推理参数 ----------
export const Roofline = {
  /**
   * Reiner Pope 在 transcript 中给出的经验比值：
   * FLOPs / memory_bandwidth ≈ 300（单位转换后无量纲）。
   * 对应 batch 平衡点 B ≈ 300 × sparsity。
   */
  computeMemoryRatio: {
    value: 300,
    note: 'specs.Roofline.computeMemoryRatio.note',
    sources: [SCALING_BOOK],
  } satisfies Spec,
  /**
   * HBM 容量 / HBM 带宽 ≈ 20ms。
   * Reiner: "在大多数 HBM 代上，读完整个 HBM 一遍约需 20ms"。
   */
  hbmDrainTimeMS: {
    value: 20,
    unit: 'ms',
    note: 'specs.Roofline.hbmDrainTime.note',
    sources: [SCALING_BOOK],
  } satisfies Spec,
}

// ---------- DeepSeek-V3 (transcript 反复引用的代表模型) ----------
export const DeepSeekV3 = {
  totalParamsB: {
    value: 671,
    unit: 'B',
    note: 'specs.DSv3.totalParams.note',
    sources: [DEEPSEEK_V3_PAPER],
  } satisfies Spec,
  activeParamsB: {
    value: 37,
    unit: 'B',
    note: 'specs.DSv3.activeParams.note',
    sources: [DEEPSEEK_V3_PAPER],
  } satisfies Spec,
  totalExperts: {
    value: 256,
    note: 'specs.DSv3.totalExperts.note',
    sources: [DEEPSEEK_V3_PAPER],
  } satisfies Spec,
  activeExperts: {
    value: 8,
    note: 'specs.DSv3.activeExperts.note',
    sources: [DEEPSEEK_V3_PAPER],
  } satisfies Spec,
  layers: {
    value: 61,
    note: 'specs.DSv3.layers.note',
    sources: [DEEPSEEK_V3_PAPER],
  } satisfies Spec,
}

// ---------- Llama 3 训练故障数据 ----------
export const Llama3Failures = {
  trainingDays: {
    value: 54,
    unit: 'days',
    note: 'specs.Llama3.trainingDays.note',
    sources: [LLAMA3_PAPER, TOMSHW_LLAMA3],
  } satisfies Spec,
  totalGPUs: {
    value: 16384,
    sources: [LLAMA3_PAPER],
  } satisfies Spec,
  totalInterruptions: {
    value: 419,
    note: 'specs.Llama3.totalInterruptions.note',
    sources: [LLAMA3_PAPER, TOMSHW_LLAMA3],
  } satisfies Spec,
  meanTimeBetweenInterruptionsHours: {
    value: 3,
    unit: 'h',
    note: 'specs.Llama3.mtbi.note',
    sources: [LLAMA3_PAPER, TOMSHW_LLAMA3],
  } satisfies Spec,
  effectiveTrainingTimePct: {
    value: 90,
    unit: '%',
    note: 'specs.Llama3.effective.note',
    sources: [LLAMA3_PAPER],
  } satisfies Spec,
  /** 中断成因分布（百分比，来自 Llama 3 paper Table 5）；cause 字段为翻译 key */
  causeBreakdown: [
    { cause: 'specs.cause.faultyGPU', pct: 30.1, sources: [LLAMA3_PAPER, TOMSHW_LLAMA3] },
    { cause: 'specs.cause.gpuHBM3', pct: 17.2, sources: [LLAMA3_PAPER, TOMSHW_LLAMA3] },
    { cause: 'specs.cause.softwareBug', pct: 12.9, sources: [LLAMA3_PAPER] },
    { cause: 'specs.cause.networkSwitch', pct: 8.4, sources: [LLAMA3_PAPER] },
    { cause: 'specs.cause.gpuSRAM', pct: 4.5, sources: [LLAMA3_PAPER] },
    { cause: 'specs.cause.gpuSystemProcessor', pct: 4.1, sources: [LLAMA3_PAPER] },
    { cause: 'specs.cause.nic', pct: 2.6, sources: [LLAMA3_PAPER] },
    { cause: 'specs.cause.ncclWatchdog', pct: 1.7, sources: [LLAMA3_PAPER] },
    { cause: 'specs.cause.silentDataCorruption', pct: 0.2, sources: [LLAMA3_PAPER] },
    { cause: 'specs.cause.other', pct: 18.3, sources: [LLAMA3_PAPER] },
  ],
}

// ---------- 故障恢复机制 ----------
// label 保持英文标签（专有名词），summary 为翻译 key。
export const RecoveryMechanisms = {
  gemini: {
    label: 'GEMINI',
    summary: 'recovery.gemini.summary',
    sources: [GEMINI_PAPER],
  },
  recycle: {
    label: 'ReCycle',
    summary: 'recovery.recycle.summary',
    sources: [RECYCLE_PAPER],
  },
  megascaleHealthCheck: {
    label: 'MegaScale Health-Check',
    summary: 'recovery.megascale.summary',
    sources: [MEGASCALE_PAPER],
  },
  acmeProfiling: {
    label: 'Acme Profiling',
    summary: 'recovery.acme.summary',
    sources: [ACME_PAPER],
  },
}

// ---------- transcript 引用 ----------
export const transcriptCite = (
  timestamp: string,
  topic: string,
): Source => ({
  label: `Reiner Pope × Dwarkesh Patel — ${topic} (${timestamp})`,
  url: 'https://www.dwarkesh.com/p/reiner-pope',
})

export const Sources = {
  NV_GB200_DS,
  NV_DGX_SUPERPOD_GB200,
  NV_MULTINODE_TUNING,
  LLAMA3_PAPER,
  DEEPSEEK_V3_PAPER,
  SCALING_LAWS_ROUTED,
  MEGASCALE_PAPER,
  ACME_PAPER,
  GEMINI_PAPER,
  RECYCLE_PAPER,
  SCALING_BOOK,
  TOMSHW_LLAMA3,
}
