"use client";

import { motion } from "framer-motion";
import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCallFlow, dialNumbers } from "@/components/calls/CallFlow";

/*
 * The Call button (2026-10-12, as in CS Portal): it asks "3CX call" or
 * "Phone call" every time (components/calls/CallFlow.tsx), follows a 3CX call
 * in a call window, then asks how the call went. The lead's call counts come
 * from 3CX with the call sync — nothing is counted here any more.
 */

interface ClickToCallProps {
  phoneNumber: string;
  leadId?: string;
  leadName?: string;
  variant?: "ghost" | "outline";
  size?: "icon" | "sm";
  showLabel?: boolean;
  className?: string;
}

export function ClickToCall({
  phoneNumber,
  leadId,
  leadName,
  variant = "ghost",
  size = "icon",
  showLabel = false,
  className = "",
}: ClickToCallProps) {
  const flow = useCallFlow();
  if (!phoneNumber) return null;

  function press(e: React.MouseEvent) {
    e.stopPropagation();   // Call buttons sit in clickable rows and cards
    if (flow) flow.chooseCall({ leadId, leadName, phone: phoneNumber });
    else window.location.href = `tel:${dialNumbers(phoneNumber)[0] ?? phoneNumber}`;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            onClick={press}
            className={`${className} text-green-400 hover:text-green-300 hover:bg-green-500/10`}
          >
            <motion.div whileTap={{ scale: 0.9 }}>
              <Phone className="h-4 w-4" />
            </motion.div>
            {showLabel && <span className="ml-2">Call</span>}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Call {leadName || phoneNumber}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
