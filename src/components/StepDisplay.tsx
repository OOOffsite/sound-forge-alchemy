
import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle, Circle, Loader2, ArrowRight } from 'lucide-react';

interface Step {
  id: string;
  label: string;
  status: 'pending' | 'current' | 'complete';
}

interface StepDisplayProps {
  steps: Step[];
}

export default function StepDisplay({ steps }: StepDisplayProps) {
  return (
    <ol className="relative border rounded-md p-4">
      {steps.map((step, index) => (
        <li 
          key={step.id}
          className={cn(
            "flex items-center",
            index !== steps.length - 1 ? "mb-4" : ""
          )}
        >
          <div className="flex-shrink-0 mr-2">
            {step.status === 'complete' && (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
            {step.status === 'current' && (
              <Loader2 className="h-5 w-5 text-primary animate-spin" />
            )}
            {step.status === 'pending' && (
              <Circle className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div className="flex-grow">
            <h4 className={cn(
              "font-medium",
              step.status === 'complete' ? "text-green-500" : 
              step.status === 'current' ? "text-primary" : 
              "text-muted-foreground"
            )}>
              {step.label}
            </h4>
          </div>
          {index !== steps.length - 1 && (
            <ArrowRight className="h-4 w-4 text-muted-foreground ml-2" />
          )}
        </li>
      ))}
    </ol>
  );
}
