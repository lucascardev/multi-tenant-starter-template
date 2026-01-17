import { Construction } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function ConstructionPage({ title = "Em Construção", message = "Estamos trabalhando duro para trazer esta funcionalidade para você em breve." }: { title?: string, message?: string }) {
    return (
        <div className="flex flex-col items-center justify-center p-8 md:p-12 min-h-[50vh]">
            <div className="p-4 bg-primary/10 rounded-full mb-4">
                <Construction className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight mb-2 text-center">{title}</h2>
            <p className="text-muted-foreground text-center max-w-md">
                {message}
            </p>
        </div>
    );
}
