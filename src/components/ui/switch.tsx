"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer data-[state=checked]:bg-primary data-[state=unchecked]:bg-[var(--surface-3)] focus-visible:border-[var(--phosphor)] focus-visible:ring-[1px] focus-visible:ring-[var(--phosphor)] inline-flex h-5 w-9 shrink-0 items-center rounded-none border border-[var(--border-base)] transition-all outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-3.5 rounded-none bg-foreground ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=checked]:bg-black data-[state=unchecked]:translate-x-0.5"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
