import * as React from "react"
import { cn } from "@/lib/utils"

const Table = React.forwardRef(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto border border-neutral-300">
    <table ref={ref} className={cn("w-full caption-bottom text-xs border-collapse", className)} {...props} />
  </div>
))
Table.displayName = "Table"

const TableHeader = React.forwardRef(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("bg-neutral-100 border-b border-neutral-300 sticky top-0 z-10", className)} {...props} />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn("divide-y divide-neutral-200 bg-white", className)} {...props} />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef(({ className, ...props }, ref) => (
  <tfoot ref={ref} className={cn("border-t border-neutral-300 bg-neutral-50 font-medium", className)} {...props} />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef(({ className, ...props }, ref) => (
  <tr ref={ref} className={cn("border-b border-neutral-200 transition-colors hover:bg-neutral-50/50 data-[state=selected]:bg-neutral-100", className)} {...props} />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef(({ className, ...props }, ref) => (
  <th ref={ref} className={cn("h-10 px-3 text-left align-middle text-[10px] tracking-[0.15em] uppercase font-bold text-neutral-500 font-sans border-r border-neutral-200 last:border-r-0", className)} {...props} />
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef(({ className, ...props }, ref) => (
  <td ref={ref} className={cn("p-3 align-middle font-sans border-r border-neutral-200 last:border-r-0 max-w-xs truncate", className)} {...props} />
))
TableCell.displayName = "TableCell"

export { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell }
