import { useReactive } from "./reactive"

export function ref(val: any) {
  return useReactive({
    value: val
  })
}