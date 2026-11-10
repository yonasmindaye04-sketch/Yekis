import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const alertVariants = cva(
  "group/alert relative flex w-full items-center gap-2.5 rounded-[6px] border px-3 py-1.5 text-left text-xs transition-colors [&_[data-slot=avatar]]:size-6 [&_[data-slot=avatar]]:rounded-[5px] [&_[data-slot=avatar-fallback]]:rounded-[5px] [&_[data-slot=avatar]_svg]:size-3.5",
  {
    variants: {
      variant: {
        default:
          "border-border/70 bg-card text-card-foreground shadow-xs",
        destructive:
          "border-destructive/30 bg-destructive/5 text-destructive dark:bg-destructive/10 dark:border-destructive/40",
        warning:
          "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/40",
        success:
          "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/40",
        info:
          "border-sky-500/30 bg-sky-500/5 text-sky-700 dark:text-sky-400 dark:bg-sky-500/10 dark:border-sky-500/40",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Alert({
  className,
  variant = "default",
  icon,
  iconBg,
  children,
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof alertVariants> & {
    icon?: React.ReactNode
    iconBg?: string
  }) {
  const defaultFallbackBg =
    variant === "destructive"
      ? "bg-destructive dark:bg-destructive/60 text-white"
      : variant === "warning"
      ? "bg-amber-600 dark:bg-amber-600/80 text-white"
      : variant === "success"
      ? "bg-emerald-600 dark:bg-emerald-600/80 text-white"
      : variant === "info"
      ? "bg-sky-600 dark:bg-sky-600/80 text-white"
      : "bg-primary dark:bg-primary/80 text-white"

  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      {icon && (
        <Avatar className="size-6 rounded-[5px] shrink-0">
          <AvatarFallback className={cn("rounded-[5px] text-white text-xs", iconBg || defaultFallbackBg)}>
            {icon}
          </AvatarFallback>
        </Avatar>
      )}
      {children}
    </div>
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "font-semibold text-xs leading-snug text-foreground [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-[11px] leading-relaxed text-muted-foreground [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-1",
        className
      )}
      {...props}
    />
  )
}

function AlertContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-content"
      className={cn("flex-1 min-w-0 space-y-0.5", className)}
      {...props}
    />
  )
}

function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-action"
      className={cn("ml-auto shrink-0", className)}
      {...props}
    />
  )
}

export interface UnifiedAlertProps
  extends Omit<React.ComponentProps<"div">, "title">,
    VariantProps<typeof alertVariants> {
  icon?: React.ReactNode
  iconBg?: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
}

function UnifiedAlert({
  variant = "default",
  icon,
  iconBg,
  title,
  description,
  action,
  className,
  children,
  ...props
}: UnifiedAlertProps) {
  const defaultFallbackBg =
    variant === "destructive"
      ? "bg-destructive dark:bg-destructive/60 text-white"
      : variant === "warning"
      ? "bg-amber-600 dark:bg-amber-600/80 text-white"
      : variant === "success"
      ? "bg-emerald-600 dark:bg-emerald-600/80 text-white"
      : variant === "info"
      ? "bg-sky-600 dark:bg-sky-600/80 text-white"
      : "bg-primary dark:bg-primary/80 text-white"

  return (
    <Alert variant={variant} className={cn("flex items-center gap-2.5", className)} {...props}>
      {icon && (
        <Avatar className="size-6 rounded-[5px] shrink-0">
          <AvatarFallback className={cn("rounded-[5px] text-white text-xs", iconBg || defaultFallbackBg)}>
            {icon}
          </AvatarFallback>
        </Avatar>
      )}
      {title || description ? (
        <AlertContent>
          {title && <AlertTitle>{title}</AlertTitle>}
          {description && <AlertDescription>{description}</AlertDescription>}
        </AlertContent>
      ) : null}
      {children}
      {action && <AlertAction>{action}</AlertAction>}
    </Alert>
  )
}

export {
  Alert,
  AlertTitle,
  AlertDescription,
  AlertContent,
  AlertAction,
  UnifiedAlert,
  alertVariants,
}
