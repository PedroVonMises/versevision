"use client";

import { useState, useRef, useCallback, ChangeEvent } from "react";
import NextImage from "next/image";
import {
  Feather,
  Upload,
  Download,
  Share2,
  Edit,
  Save,
  X,
  LoaderCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { generatePoemFromImage } from "@/ai/flows/generate-poem-from-image";

async function createCombinedImage(
  imageUrl: string,
  text: string,
  font: string,
  textColor: string,
  bgColor: string
): Promise<Blob | null> {
  return new Promise((resolve) => {
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }

      canvas.width = image.width;
      canvas.height = image.height;

      ctx.drawImage(image, 0, 0);

      // Text styling
      const fontSize = Math.max(24, image.width / 30);
      ctx.font = `italic ${fontSize}px ${font}`;
      ctx.fillStyle = textColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const lines = text.split("\n");
      const lineHeight = fontSize * 1.2;
      const totalTextHeight = lines.length * lineHeight;
      
      const padding = 20;
      const bgHeight = totalTextHeight + padding * 2;
      const bgY = canvas.height - bgHeight - 40;

      // Draw semi-transparent background for text
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, bgY, canvas.width, bgHeight);

      // Draw text lines
      ctx.fillStyle = textColor;
      lines.forEach((line, index) => {
        const y = bgY + padding + lineHeight / 2 + index * lineHeight;
        ctx.fillText(line, canvas.width / 2, y);
      });

      canvas.toBlob((blob) => resolve(blob), "image/png");
    };
    image.onerror = () => resolve(null);
    image.src = imageUrl;
  });
}

export default function Home() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [poem, setPoem] = useState<string>("");
  const [editedPoem, setEditedPoem] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handlePoemGeneration = useCallback(
    async (dataUrl: string) => {
      setIsGenerating(true);
      setPoem("");
      try {
        const result = await generatePoemFromImage({ photoDataUri: dataUrl });
        if (result.poem) {
          setPoem(result.poem);
          setEditedPoem(result.poem);
        } else {
          throw new Error("O poema gerado estava vazio.");
        }
      } catch (error) {
        console.error("Falha na geração do poema:", error);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível gerar um poema. Por favor, tente outra imagem.",
        });
      } finally {
        setIsGenerating(false);
      }
    },
    [toast]
  );

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({
          variant: "destructive",
          title: "Arquivo Inválido",
          description: "Por favor, envie um arquivo de imagem.",
        });
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setImageUrl(dataUrl);
        handlePoemGeneration(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleEdit = () => {
    setEditedPoem(poem);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    setPoem(editedPoem);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleAction = async (action: "download" | "share") => {
    if (!imageUrl || !poem) return;

    setIsProcessing(true);
    try {
      const blob = await createCombinedImage(imageUrl, poem, 'Literata', '#FFFFFF', 'rgba(54, 51, 51, 0.7)');
      if (!blob) throw new Error("Falha ao criar a imagem.");

      if (action === "download") {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "verso-visao.png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else if (action === "share") {
        const file = new File([blob], "verso-visao.png", { type: "image/png" });
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: "Criação VersoVisão",
            text: `Um poema inspirado na minha foto:\n\n${poem}`,
            files: [file],
          });
        } else {
          toast({
            variant: "destructive",
            title: "Compartilhamento não suportado",
            description: "Seu navegador não suporta o compartilhamento de arquivos. Para compartilhar, use uma conexão segura (HTTPS).",
          });
        }
      }
    } catch (error: any) {
      console.error(`${action} falhou:`, error);
      const isAbortError = error.name === 'AbortError';
      if (isAbortError) {
        // User cancelled the share, do not show an error
        return;
      }
      toast({
        variant: "destructive",
        title: "Erro",
        description: `Não foi possível ${action === 'download' ? 'baixar' : 'compartilhar'} sua criação.`,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background font-body text-foreground">
      <header className="py-6 px-4 md:px-8">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <Feather className="text-primary w-8 h-8" />
          <h1 className="text-3xl font-bold font-headline tracking-tight">
            Verso<span className="text-primary">Visão</span>
          </h1>
        </div>
      </header>
      <main className="flex-1 p-4 md:p-8">
        <div className="grid gap-8 md:grid-cols-2 max-w-6xl mx-auto">
          <Card className="shadow-lg overflow-hidden transition-all duration-300">
            <CardContent className="p-0">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/*"
                className="hidden"
              />
              {!imageUrl ? (
                <div
                  className="flex flex-col items-center justify-center h-full min-h-[400px] bg-card border-4 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary hover:bg-secondary transition-colors"
                  onClick={triggerFileUpload}
                  onKeyDown={(e) => e.key === 'Enter' && triggerFileUpload()}
                  tabIndex={0}
                  role="button"
                  aria-label="Envie uma foto"
                >
                  <Upload className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Envie uma foto</h3>
                  <p className="text-muted-foreground">
                    Deixe nossa IA criar um poema a partir da sua imagem.
                  </p>
                </div>
              ) : (
                <div className="relative aspect-square w-full">
                  <NextImage
                    src={imageUrl}
                    alt="Envio do usuário"
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                    data-ai-hint="imagem do usuário"
                  />
                </div>
              )}
            </CardContent>
            {imageUrl && (
              <CardFooter className="p-4 bg-muted/50">
                <Button variant="outline" onClick={triggerFileUpload} className="w-full">
                  Mudar Foto
                </Button>
              </CardFooter>
            )}
          </Card>

          <Card className="shadow-lg flex flex-col transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-2xl font-headline">Seu Poema</CardTitle>
              <CardDescription>
                {isGenerating ? "Nossa IA está criando sua obra-prima..." : "Um poema gerado por IA inspirado na sua foto."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              {isGenerating ? (
                <div className="space-y-4">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
              ) : poem ? (
                isEditing ? (
                  <Textarea
                    value={editedPoem}
                    onChange={(e) => setEditedPoem(e.target.value)}
                    className="h-full min-h-[200px] text-base"
                    aria-label="Edite seu poema"
                  />
                ) : (
                  <div className="text-lg whitespace-pre-wrap font-serif italic text-foreground/90 p-4 bg-secondary rounded-md min-h-[200px]">
                    {poem}
                  </div>
                )
              ) : (
                <div className="flex items-center justify-center h-full min-h-[200px] text-muted-foreground">
                  <p>Seu poema aparecerá aqui.</p>
                </div>
              )}
            </CardContent>
            {poem && (
              <CardFooter className="flex flex-col sm:flex-row gap-2 justify-end">
                {isEditing ? (
                  <>
                    <Button variant="ghost" onClick={handleCancelEdit}>
                      <X className="mr-2" /> Cancelar
                    </Button>
                    <Button onClick={handleSaveEdit}>
                      <Save className="mr-2" /> Salvar Alterações
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="secondary" onClick={handleEdit}>
                      <Edit className="mr-2" /> Editar
                    </Button>
                    <Button
                      onClick={() => handleAction("share")}
                      disabled={isProcessing}
                    >
                      {isProcessing ? <LoaderCircle className="animate-spin mr-2"/> : <Share2 className="mr-2" />}
                      Compartilhar
                    </Button>
                    <Button
                      onClick={() => handleAction("download")}
                      disabled={isProcessing}
                    >
                      {isProcessing ? <LoaderCircle className="animate-spin mr-2"/> : <Download className="mr-2" />}
                      Baixar
                    </Button>
                  </>
                )}
              </CardFooter>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
