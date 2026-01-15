"use client";

import Autoplay from "embla-carousel-autoplay";
import useEmblaCarousel from "embla-carousel-react";
import Image from "next/image";
import { PhoneFrame } from "./ui/phone-frame";
import { ChevronLeft, MoreVertical, Phone, Video, Smile, Paperclip, Mic, Camera } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const carouselImages = [
  "/assets/social-proof/conversation-01.png",
  "/assets/social-proof/conversation-02.png",
  "/assets/social-proof/conversation-03.png",
  "/assets/social-proof/conversation-04.png",
  "/assets/social-proof/conversation-05.png",
  "/assets/social-proof/conversation-06.png",
  "/assets/social-proof/conversation-07.png",
  "/assets/social-proof/conversation-08.png",
  "/assets/social-proof/conversation-09.png",
];

export function SocialProofCarousel() {
  const [emblaRef] = useEmblaCarousel({ loop: true }, [Autoplay({ delay: 4000 })]);

  return (
    <div className="w-full py-12 flex flex-col items-center">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold tracking-tighter md:text-4xl text-foreground">
          Veja a Clara em Ação
        </h2>
        <p className="text-muted-foreground mt-2">
          Exemplos reais de como a Clara atende seus pacientes.
        </p>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-12">
        <PhoneFrame>
            {/* Header Overlay */}
            <div className="absolute top-0 left-0 right-0 h-16 bg-[#202c33] z-20 flex items-center px-1 text-white rounded-t-[2rem]">
                <div className="flex items-center gap-1">
                    <ChevronLeft className="w-6 h-6 text-[#00a884] cursor-pointer" />
                    <Avatar className="w-9 h-9 cursor-pointer">
                        <AvatarImage src="/assets/clara-avatar.png" />
                        <AvatarFallback className="bg-sky-500 text-white">CL</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col ml-2 cursor-pointer">
                        <span className="font-semibold text-sm leading-tight">Clara</span>
                        <span className="text-xs text-zinc-400 leading-tight">online</span>
                    </div>
                </div>
                <div className="flex-grow" />
                <div className="flex items-center gap-4 mr-2 text-[#00a884]">
                    <Video className="w-5 h-5 cursor-pointer" />
                    <Phone className="w-5 h-5 cursor-pointer" />
                    <MoreVertical className="w-5 h-5 text-gray-400 cursor-pointer" />
                </div>
            </div>

            {/* Carousel */}
            <div className="overflow-hidden h-full pt-16 pb-16 bg-[#0b141a]" ref={emblaRef}>
                <div className="flex h-full">
                {carouselImages.map((src, index) => (
                    <div className="flex-[0_0_100%] min-w-0 relative h-full" key={index}>
                        <Image
                            src={src}
                            alt={`Exemplo de conversa no WhatsApp ${index + 1}`}
                            fill
                            className="object-cover"
                            priority={index === 0}
                        />
                    </div>
                ))}
                </div>
            </div>

            {/* Footer Overlay */}
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-[#202c33] z-20 flex items-center px-2 py-2 gap-2 rounded-b-[2rem]">
                <div className="flex-1 bg-[#2a3942] rounded-full h-10 flex items-center px-3 gap-2">
                    <Smile className="w-6 h-6 text-gray-400 cursor-pointer" />
                    <input 
                        type="text" 
                        placeholder="Mensagem" 
                        className="bg-transparent border-none outline-none text-white text-sm w-full placeholder-gray-400"
                        readOnly
                    />
                    <Paperclip className="w-5 h-5 text-gray-400 cursor-pointer -rotate-45" />
                    <Camera className="w-5 h-5 text-gray-400 cursor-pointer" />
                </div>
                <div className="w-10 h-10 bg-[#00a884] rounded-full flex items-center justify-center cursor-pointer shadow-md">
                    <Mic className="w-5 h-5 text-white" />
                </div>
            </div>
        </PhoneFrame>

        <div className="flex flex-col items-center md:items-start gap-4 max-w-sm text-center md:text-left">
            <h3 className="text-2xl font-bold">Teste Agora Mesmo!</h3>
            <p className="text-muted-foreground">
                Quer ver como a Clara funciona na prática? Mande uma mensagem para nossa versão de demonstração agora mesmo.
            </p>
            <a 
                href="https://wa.me/5571992670174" 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-11 rounded-md px-8"
            >
                Falar com a Clara no WhatsApp
            </a>
        </div>
      </div>
    </div>
  );
}
