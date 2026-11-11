"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { Tabs as TabsPrimitive } from "radix-ui";
import type * as React from "react";

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "group/tabs block data-[orientation=vertical]:flex data-[orientation=vertical]:gap-4",
        className,
      )}
      {...props}
    />
  );
}

const tabsListVariants = cva(
  "grid w-full grid-cols-2 gap-4 border-b border-border group-data-[orientation=vertical]/tabs:w-auto group-data-[orientation=vertical]/tabs:grid-cols-1 group-data-[orientation=vertical]/tabs:border-r group-data-[orientation=vertical]/tabs:border-b-0",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        line: "bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "flex cursor-pointer items-center justify-center gap-[7px] border-0 border-b-2 border-transparent bg-transparent px-0 pt-2.5 pb-[13px] text-[13px] font-semibold text-muted transition-colors disabled:cursor-not-allowed disabled:opacity-55 data-[state=active]:border-accent data-[state=active]:text-accent motion-reduce:transition-none",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 text-sm", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants };
