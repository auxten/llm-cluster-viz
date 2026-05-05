import { useStory } from '../state/storyStore'
import { storylineById } from '../data/storylines'

/**
 * 按 step id 名查询当前 step 的索引，避免 stepIndex 数字硬编码。
 *
 * 用法：
 *   const gate = useStepGate('t1_moe_all_to_all')
 *   const showAllToAll = gate.atOrAfter('broadcast')  // 当前 step 在 'broadcast' 之后（含）
 *   const isStep = gate.is('reduce')
 *   const stepIdx = gate.indexOf('compute')  // 静态查询某 step 的 index
 */
export function useStepGate(storyId: string) {
  const stepIndex = useStory((s) => s.stepIndex)
  const story = storylineById(storyId)
  const indexOf = (id: string): number =>
    story?.steps.findIndex((s) => s.id === id) ?? -1
  const currentId = story?.steps[stepIndex]?.id ?? ''
  return {
    stepIndex,
    currentId,
    indexOf,
    is: (id: string) => currentId === id,
    atOrAfter: (id: string) => {
      const i = indexOf(id)
      return i >= 0 && stepIndex >= i
    },
    after: (id: string) => {
      const i = indexOf(id)
      return i >= 0 && stepIndex > i
    },
    before: (id: string) => {
      const i = indexOf(id)
      return i >= 0 && stepIndex < i
    },
    between: (fromId: string, toId: string) => {
      const a = indexOf(fromId)
      const b = indexOf(toId)
      return a >= 0 && b >= 0 && stepIndex >= a && stepIndex <= b
    },
  }
}
