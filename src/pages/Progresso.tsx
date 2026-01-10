import { Star, Trophy, Medal, Zap } from "lucide-react";
import { Navigation } from "@/components/Layout/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const Progresso = () => {
  // Placeholder values for now
  const pontos = 250;
  const nivelAtual = 3;
  const proximoNivel = 500;
  const progressoNivel = (pontos / proximoNivel) * 100;

  const conquistas = [
    { nome: "Primeiro Hábito", descricao: "Criaste o teu primeiro hábito", icone: Star, desbloqueada: true },
    { nome: "Semana Perfeita", descricao: "7 dias seguidos a cumprir todos os hábitos", icone: Trophy, desbloqueada: false },
    { nome: "Maratonista", descricao: "30 dias de streak", icone: Medal, desbloqueada: false },
    { nome: "Super Produtivo", descricao: "Completa 100 hábitos", icone: Zap, desbloqueada: false },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />

      <main className="container py-6 space-y-6">
        <h1 className="text-2xl font-bold">Progresso & Recompensas</h1>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Pontos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Pontos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-primary">{pontos}</p>
              <p className="text-sm text-muted-foreground mt-1">pontos acumulados</p>
            </CardContent>
          </Card>

          {/* Nível Atual */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Nível Atual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-primary">Nível {nivelAtual}</p>
              <div className="mt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progresso para o próximo nível</span>
                  <span className="font-medium">{pontos}/{proximoNivel}</span>
                </div>
                <Progress value={progressoNivel} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Conquistas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Medal className="h-5 w-5 text-amber-500" />
              Conquistas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {conquistas.map((conquista) => (
                <div
                  key={conquista.nome}
                  className={`flex items-center gap-4 rounded-xl border border-border/50 p-4 transition-all ${
                    conquista.desbloqueada
                      ? "bg-primary/10 border-primary/30"
                      : "bg-secondary/30 opacity-60"
                  }`}
                >
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
                    conquista.desbloqueada ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    <conquista.icone className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-medium">{conquista.nome}</p>
                    <p className="text-sm text-muted-foreground">{conquista.descricao}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="rounded-xl border border-dashed border-border/50 bg-card/50 p-8 text-center">
          <p className="text-muted-foreground">
            🚧 Sistema de gamificação em desenvolvimento...
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Em breve: pontos por hábitos cumpridos, níveis, conquistas e muito mais!
          </p>
        </div>
      </main>
    </div>
  );
};

export default Progresso;
