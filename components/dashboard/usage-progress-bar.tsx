"use client"

import React from 'react'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface UsageProgressBarProps {
	value: number
	max: number
	graceBuffer?: number
	label: string
	unit?: string
}

export function UsageProgressBar({
	value,
	max,
	graceBuffer = 0,
	label,
	unit = '',
}: UsageProgressBarProps) {
	const totalCapacity = max + graceBuffer
	const percentage = Math.min((value / totalCapacity) * 100, 100)
    const usagePercentageOfMax = (value / max) * 100;

	// Determine Color State
	let colorClass = 'bg-primary' // Default Green/Primary
    let textColorClass = 'text-muted-foreground';

	if (value > max) {
        // In Grace Period
		colorClass = 'bg-yellow-500' 
        textColorClass = 'text-yellow-600 dark:text-yellow-500 font-medium';
	}
    if (value >= totalCapacity) {
        // Exceeded Total Capacity (Blocked)
        colorClass = 'bg-destructive' 
        textColorClass = 'text-destructive font-bold';
    }

	return (
		<div className="space-y-2">
			<div className="flex justify-between text-sm">
				<span className="font-medium text-muted-foreground">{label}</span>
				<span className={cn("text-xs", textColorClass)}>
					{value} / {max} {unit}
                    {value > max && (
                        <span className="ml-1">
                            (Grace: +{graceBuffer})
                        </span>
                    )}
				</span>
			</div>
			
            {/* Custom Progress Wrapper to handle color override */}
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                    className={cn("h-full w-full flex-1 transition-all", colorClass)}
                    style={{ transform: `translateX(-${100 - percentage}%)` }}
                />
            </div>

            {value > max && value < totalCapacity && (
                 <p className="text-[10px] text-yellow-600 dark:text-yellow-400 mt-1 font-medium">
                    ⚠️ Zona de Grace (Uso excedente permitido)
                 </p>
            )}
            {value >= totalCapacity && (
                 <p className="text-[10px] text-destructive mt-1 font-bold">
                    🚫 Limite Total Excedido (Bloqueado)
                 </p>
            )}
		</div>
	)
}
