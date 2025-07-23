"use client";

import { useState, useRef, useCallback, ChangeEvent } from "react";
import Image from "next/image";
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
    const image = new Image();
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
          throw new Error("The generated poem was empty.");
        }
      } catch (error) {
        console.error("Poem generation failed:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not generate a poem. Please try another image.",
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
          title: "Invalid File",
          description: "Please upload an image file.",
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
      if (!blob) throw new Error("Failed to create image.");

      if (action === "download") {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "verse-vision.png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else if (action === "share") {
        if (navigator.share && navigator.canShare({ files: [new File([blob], 'verse-vision.png', { type: 'image/png' })] })) {
          const file = new File([blob], "verse-vision.png", { type: "image/png" });
          await navigator.share({
            title: "VerseVision Creation",
            text: `A poem inspired by my photo:\n\n${poem}`,
            files: [file],
          });
        } else {
          toast({
            variant: "destructive",
            title: "Sharing not supported",
            description: "Your browser does not support sharing files.",
          });
        }
      }
    } catch (error) {
      console.error(`${action} failed:`, error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `Could not ${action} your creation.`,
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
            Verse<span className="text-primary">Vision</span>
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
                  aria-label="Upload a photo"
                >
                  <Upload className="w-16 h-16 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Upload a photo</h3>
                  <p className="text-muted-foreground">
                    Let our AI craft a poem from your image.
                  </p>
                </div>
              ) : (
                <div className="relative aspect-square w-full">
                  <Image
                    src={imageUrl}
                    alt="User upload"
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                    data-ai-hint="user image"
                  />
                </div>
              )}
            </CardContent>
            {imageUrl && (
              <CardFooter className="p-4 bg-muted/50">
                <Button variant="outline" onClick={triggerFileUpload} className="w-full">
                  Change Photo
                </Button>
              </CardFooter>
            )}
          </Card>

          <Card className="shadow-lg flex flex-col transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-2xl font-headline">Your Poem</CardTitle>
              <CardDescription>
                {isGenerating ? "Our AI is crafting your masterpiece..." : "An AI-generated poem inspired by your photo."}
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
                    aria-label="Edit your poem"
                  />
                ) : (
                  <div className="text-lg whitespace-pre-wrap font-serif italic text-foreground/90 p-4 bg-secondary rounded-md min-h-[200px]">
                    {poem}
                  </div>
                )
              ) : (
                <div className="flex items-center justify-center h-full min-h-[200px] text-muted-foreground">
                  <p>Your poem will appear here.</p>
                </div>
              )}
            </CardContent>
            {poem && (
              <CardFooter className="flex flex-col sm:flex-row gap-2 justify-end">
                {isEditing ? (
                  <>
                    <Button variant="ghost" onClick={handleCancelEdit}>
                      <X className="mr-2" /> Cancel
                    </Button>
                    <Button onClick={handleSaveEdit}>
                      <Save className="mr-2" /> Save Changes
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="secondary" onClick={handleEdit}>
                      <Edit className="mr-2" /> Edit
                    </Button>
                    <Button
                      onClick={() => handleAction("share")}
                      disabled={isProcessing}
                    >
                      {isProcessing ? <LoaderCircle className="animate-spin mr-2"/> : <Share2 className="mr-2" />}
                      Share
                    </Button>
                    <Button
                      onClick={() => handleAction("download")}
                      disabled={isProcessing}
                    >
                      {isProcessing ? <LoaderCircle className="animate-spin mr-2"/> : <Download className="mr-2" />}
                      Download
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
