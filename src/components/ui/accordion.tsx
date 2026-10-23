"use client";

import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { Plus } from "lucide-react";

export const Accordion = AccordionPrimitive.Root;

export function AccordionItem({ className = "", ...props }: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return <AccordionPrimitive.Item className={`border-b border-border ${className}`} {...props} />;
}

export function AccordionTrigger({ children, ...props }: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        className="group flex min-h-14 flex-1 items-center justify-between gap-4 py-4 text-left text-lg font-semibold transition-colors hover:text-gold"
        {...props}
      >
        {children}
        <Plus className="h-5 w-5 shrink-0 text-gold transition-transform duration-200 group-data-[state=open]:rotate-45" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

export function AccordionContent({ children, ...props }: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content className="overflow-hidden text-muted data-[state=closed]:hidden" {...props}>
      <div className="pb-5 leading-relaxed">{children}</div>
    </AccordionPrimitive.Content>
  );
}
