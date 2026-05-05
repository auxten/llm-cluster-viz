import * as THREE from 'three'

/**
 * 共享的 PBR 材质池：所有硬件组件使用同一组 cached material 减少 draw call 与状态切换。
 * 注意 three.js 材质即使共享几何体也是 immutable 的，按需 clone 即可。
 */

export const M = {
  // 机柜 / chassis 类
  chassis: new THREE.MeshStandardMaterial({
    color: '#5a6478',
    metalness: 0.78,
    roughness: 0.4,
  }),
  chassisDark: new THREE.MeshStandardMaterial({
    color: '#363d4d',
    metalness: 0.55,
    roughness: 0.5,
  }),
  trayMetal: new THREE.MeshStandardMaterial({
    color: '#6b7588',
    metalness: 0.88,
    roughness: 0.28,
  }),

  // PCB 类
  pcbGreen: new THREE.MeshStandardMaterial({
    color: '#2e6048',
    metalness: 0.12,
    roughness: 0.65,
    emissive: '#1a3a26',
    emissiveIntensity: 0.25,
  }),
  pcbBlack: new THREE.MeshStandardMaterial({
    color: '#2a3242',
    metalness: 0.15,
    roughness: 0.65,
  }),

  // 芯片 die / package
  silicon: new THREE.MeshStandardMaterial({
    color: '#5a6070',
    metalness: 0.55,
    roughness: 0.38,
  }),
  siliconBare: new THREE.MeshStandardMaterial({
    color: '#828892',
    metalness: 0.7,
    roughness: 0.24,
  }),
  hbm: new THREE.MeshStandardMaterial({
    color: '#7a6f88',
    metalness: 0.6,
    roughness: 0.32,
  }),
  packageGold: new THREE.MeshStandardMaterial({
    color: '#d4a64a',
    metalness: 0.95,
    roughness: 0.28,
  }),

  // 散热器
  heatsinkAlu: new THREE.MeshStandardMaterial({
    color: '#c0c8d2',
    metalness: 0.95,
    roughness: 0.2,
  }),

  // 电缆/管路
  copper: new THREE.MeshStandardMaterial({
    color: '#d49659',
    metalness: 0.92,
    roughness: 0.24,
  }),
  cableJacket: new THREE.MeshStandardMaterial({
    color: '#3a4150',
    metalness: 0.1,
    roughness: 0.65,
  }),

  // emissive 用于 LED / "数据流" 高亮
  ledGreen: new THREE.MeshBasicMaterial({ color: '#a4ee27' }),
  ledBlue: new THREE.MeshBasicMaterial({ color: '#6cb8ff' }),
  ledAmber: new THREE.MeshBasicMaterial({ color: '#ffc56b' }),
  ledRed: new THREE.MeshBasicMaterial({ color: '#ff7a7a' }),

  nvlinkEmissive: new THREE.MeshStandardMaterial({
    color: '#5a7028',
    emissive: '#a4ee27',
    emissiveIntensity: 0.85,
    metalness: 0.4,
    roughness: 0.5,
  }),
  ibEmissive: new THREE.MeshStandardMaterial({
    color: '#2a4870',
    emissive: '#6cb8ff',
    emissiveIntensity: 0.85,
    metalness: 0.4,
    roughness: 0.5,
  }),

  coolantCold: new THREE.MeshStandardMaterial({
    color: '#5a8fd5',
    metalness: 0.55,
    roughness: 0.35,
    emissive: '#6cb8ff',
    emissiveIntensity: 0.32,
  }),
  coolantHot: new THREE.MeshStandardMaterial({
    color: '#c66060',
    metalness: 0.55,
    roughness: 0.35,
    emissive: '#ff7a7a',
    emissiveIntensity: 0.32,
  }),
}
