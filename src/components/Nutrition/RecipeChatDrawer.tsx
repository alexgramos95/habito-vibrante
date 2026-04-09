import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, Loader2, X } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Recipe } from "@/data/nutritionTypes";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface RecipeChatDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe: Recipe;
  locale: string;
}

const SUGGESTIONS_PT = [
  "Posso substituir algum ingrediente por uma opção mais saudável?",
  "Tenho intolerância à lactose, o que posso usar?",
  "Como posso aumentar a proteína desta receita?",
];

const SUGGESTIONS_EN = [
  "Can I substitute any ingredient for a healthier option?",
  "I'm lactose intolerant, what can I use instead?",
  "How can I increase the protein in this recipe?",
];

export function RecipeChatDrawer({ open, onOpenChange, recipe, locale }: RecipeChatDrawerProps) {
  const lang = locale.startsWith("pt") ? "pt" : "en";
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const suggestions = lang === "pt" ? SUGGESTIONS_PT : SUGGESTIONS_EN;

  useEffect(() => {
    if (open) {
      setMessages([]);
      setInput("");
    }
  }, [open, recipe.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("recipe-chat", {
        body: {
          recipe: {
            name: recipe.name,
            ingredients: recipe.ingredients,
            macros: recipe.macros,
          },
          messages: newMessages,
          locale: lang,
        },
      });

      if (error) throw error;

      if (data?.error) {
        toast({
          title: lang === "pt" ? "Erro" : "Error",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err: any) {
      toast({
        title: lang === "pt" ? "Erro" : "Error",
        description: lang === "pt" ? "Não foi possível obter resposta." : "Failed to get response.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="pb-2">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-sm flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" />
              {recipe.imageEmoji} {recipe.name}
            </DrawerTitle>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {lang === "pt"
              ? "Pergunta sobre substituições ou melhorias de ingredientes"
              : "Ask about ingredient substitutions or improvements"}
          </p>
        </DrawerHeader>

        <div className="flex flex-col h-[60vh] px-4 pb-4">
          {/* Messages */}
          <ScrollArea className="flex-1 pr-2" ref={scrollRef}>
            <div className="space-y-3 py-2">
              {messages.length === 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground text-center mb-3">
                    {lang === "pt" ? "Sugestões rápidas:" : "Quick suggestions:"}
                  </p>
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(s)}
                      className="w-full text-left text-xs p-2.5 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "text-xs rounded-xl px-3 py-2 max-w-[85%] whitespace-pre-wrap",
                    msg.role === "user"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {msg.content}
                </div>
              ))}

              {loading && (
                <div className="bg-muted rounded-xl px-3 py-2 max-w-[85%] flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {lang === "pt" ? "A pensar..." : "Thinking..."}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="flex gap-2 pt-2 border-t">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendMessage(input)}
              placeholder={lang === "pt" ? "Escreve a tua pergunta..." : "Type your question..."}
              className="text-xs h-9"
              disabled={loading}
            />
            <Button
              size="icon"
              className="h-9 w-9 shrink-0"
              disabled={!input.trim() || loading}
              onClick={() => sendMessage(input)}
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
