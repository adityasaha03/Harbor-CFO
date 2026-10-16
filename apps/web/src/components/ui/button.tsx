import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
        destructive:
          'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        outline:
          'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
        secondary:
          'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
  loadingText?: string;
}

function hasLoaderInDescendants(node: React.ReactNode): boolean {
  if (!node) return false;
  if (React.isValidElement(node)) {
    const props = node.props as { className?: string; children?: React.ReactNode };
    if (props?.className && props.className.includes('animate-spin')) {
      return true;
    }
    const type = node.type as { displayName?: string; name?: string };
    const name = type?.displayName || type?.name || '';
    if (name.toLowerCase().includes('loader') || name.toLowerCase().includes('spin')) {
      return true;
    }
    if (props?.children) {
      return hasLoaderInDescendants(props.children);
    }
  }
  if (Array.isArray(node)) {
    return node.some(hasLoaderInDescendants);
  }
  return false;
}

function hasLoadingEllipsis(node: React.ReactNode): boolean {
  if (!node) return false;
  if (typeof node === 'string') {
    const trimmed = node.trim();
    return trimmed.endsWith('...') || trimmed.endsWith('…');
  }
  if (React.isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode };
    if (props?.children) {
      return hasLoadingEllipsis(props.children);
    }
  }
  if (Array.isArray(node)) {
    return node.some(hasLoadingEllipsis);
  }
  return false;
}

function isIconElement(node: React.ReactNode): boolean {
  if (!React.isValidElement(node)) return false;
  if (node.type === 'svg') return true;
  const props = node.props as { className?: string };
  if (props?.className && /\b(h-[345]|w-[345])\b/.test(props.className)) {
    return true;
  }
  const type = node.type as { displayName?: string; name?: string };
  const name = type?.displayName || type?.name || '';
  return Boolean(name && props?.className);
}

function renderButtonContent(
  children: React.ReactNode,
  showLoader: boolean,
  loadingText?: string,
): React.ReactNode {
  if (!showLoader) {
    return children;
  }

  if (loadingText) {
    return (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin shrink-0" />
        {loadingText}
      </>
    );
  }

  if (hasLoaderInDescendants(children)) {
    return children;
  }

  if (Array.isArray(children)) {
    const firstNonEmptyIndex = children.findIndex((c) => Boolean(c));
    if (firstNonEmptyIndex !== -1 && isIconElement(children[firstNonEmptyIndex])) {
      const cloned = [...children];
      cloned[firstNonEmptyIndex] = (
        <Loader2 key="button-loader-spinner" className="mr-2 h-4 w-4 animate-spin shrink-0" />
      );
      return cloned;
    }
  } else if (isIconElement(children)) {
    return <Loader2 className="h-4 w-4 animate-spin shrink-0" />;
  }

  return (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin shrink-0" />
      {children}
    </>
  );
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      isLoading = false,
      loadingText,
      disabled,
      children,
      onClick,
      ...props
    },
    ref,
  ) => {
    const [isActionPending, setIsActionPending] = React.useState(false);

    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Slot>
      );
    }

    const isEllipsisLoading = Boolean(disabled && hasLoadingEllipsis(children));
    const showLoader = Boolean(isLoading || isActionPending || isEllipsisLoading);
    const isDisabled = Boolean(disabled || showLoader);

    const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
      if (isDisabled) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (onClick) {
        try {
          const res = onClick(e);
          if (res && typeof (res as Promise<unknown>).then === 'function') {
            setIsActionPending(true);
            await res;
          }
        } finally {
          setIsActionPending(false);
        }
      }
    };

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isDisabled}
        aria-busy={showLoader}
        onClick={handleClick}
        {...props}
      >
        {renderButtonContent(children, showLoader, loadingText)}
      </button>
    );
  },
);
Button.displayName = 'Button';
