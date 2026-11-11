import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { Slot } from "radix-ui";
import type * as React from "react";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-[5px] border border-transparent text-sm leading-[1.35] font-semibold whitespace-nowrap no-underline transition-colors select-none not-disabled:cursor-pointer disabled:cursor-not-allowed disabled:opacity-55 aria-disabled:cursor-not-allowed aria-disabled:opacity-55 motion-reduce:transition-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-accent text-accent-foreground not-disabled:hover:brightness-[0.94]",
        outline:
          "border-border bg-surface text-foreground not-disabled:hover:bg-background",
        secondary: "bg-canvas text-foreground not-disabled:hover:bg-background",
        ghost: "bg-transparent text-muted not-disabled:hover:bg-background",
        destructive: "bg-red-700 text-white not-disabled:hover:bg-red-800",
        link: "bg-transparent text-accent underline-offset-4 not-disabled:hover:underline",
      },
      size: {
        default: "px-4 py-[11px]",
        xs: "gap-1 px-2 py-1 text-xs",
        sm: "px-3 py-2",
        lg: "px-5 py-3",
        icon: "size-[38px] p-0",
        "icon-xs": "size-6 p-0",
        "icon-sm": "size-7 p-0",
        "icon-lg": "size-9 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
