import { Zap } from "lucide-react"
import Image from "next/image"

export function Header() {
  return (
    <div className="w-full">
      <div className="flex items-center gap-4">
        <div className="flex items-center">
          <Image src="/images/qubit-logo.png" alt="Qubit Logo" width={48} height={48} className="mr-3" />
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight flex items-center">
            Qubit{" "}
            <span className="text-amber-400 ml-2 flex items-center">
              <Zap size={20} className="mr-1" /> Fund
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">AI-Powered Trading Intelligence</p>
        </div>
      </div>
    </div>
  )
}
