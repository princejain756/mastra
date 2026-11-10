---
'@mastra/core': patch
'@mastra/memory': patch
---

Fixed `Memory` working memory instruction overrides (`getWorkingMemoryToolInstruction`, `__experimental_getWorkingMemoryToolInstructionVNext`, and `getReadOnlyWorkingMemoryInstruction`) not taking effect during agent runs by forwarding the memory instance's instruction methods into the `WorkingMemory` input processor.
