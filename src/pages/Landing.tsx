import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { Brain, Sparkles, Calendar, Target, MessageSquare, Trophy, ArrowRight, CheckCircle } from "lucide-react";

export default function Landing() {
  const { t } = useLanguage();

  const features = [
    {
      icon: Calendar,
      titleKey: "landing.smartPlanning",
      descriptionKey: "landing.smartPlanningDesc",
    },
    {
      icon: Target,
      titleKey: "landing.taskManagement",
      descriptionKey: "landing.taskManagementDesc",
    },
    {
      icon: MessageSquare,
      titleKey: "landing.aiChat",
      descriptionKey: "landing.aiChatDesc",
    },
    {
      icon: Trophy,
      titleKey: "achievements.title",
      descriptionKey: "achievements.progress",
    },
  ];

  const benefitsKeys = [
    "landing.smartPlanningDesc",
    "landing.aiChatDesc",
    "landing.taskManagementDesc",
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full glass border-b border-border/50">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg focus-gradient">
              <Brain className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold focus-gradient-text">{t("landing.title")}</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/auth">
              <Button variant="ghost">{t("auth.login")}</Button>
            </Link>
            <Link to="/auth?mode=signup">
              <Button className="focus-gradient">{t("landing.getStarted")}</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 pb-20">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
        </div>
        
        <div className="container mx-auto px-4 text-center">
          <div className="mx-auto max-w-4xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>{t("landing.aiChat")}</span>
            </div>
            
            <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight md:text-7xl">
              {t("landing.subtitle")}
            </h1>
            
            <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground md:text-xl">
              {t("landing.description")}
            </p>
            
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/auth?mode=signup">
                <Button size="lg" className="focus-gradient gap-2 px-8 text-lg">
                  {t("landing.getStarted")}
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline" className="px-8 text-lg">
                  {t("auth.login")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              {t("landing.features")}
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              {t("landing.description")}
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <div
                key={feature.titleKey}
                className="group rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl focus-gradient">
                  <feature.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{t(feature.titleKey)}</h3>
                <p className="text-sm text-muted-foreground">{t(feature.descriptionKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="mb-6 text-3xl font-bold md:text-4xl">
                {t("landing.title")}
              </h2>
              <p className="mb-8 text-lg text-muted-foreground">
                {t("landing.subtitle")}
              </p>
              <ul className="space-y-4">
                {benefitsKeys.map((key) => (
                  <li key={key} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 shrink-0 text-primary" />
                    <span>{t(key)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="rounded-2xl border border-border bg-card p-8 shadow-xl">
                <div className="mb-4 flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-destructive" />
                  <div className="h-3 w-3 rounded-full bg-warning" />
                  <div className="h-3 w-3 rounded-full bg-success" />
                </div>
                <div className="space-y-4">
                  <div className="rounded-lg bg-muted p-4">
                    <p className="text-sm font-medium">{t("chat.title")}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("landing.aiChatDesc")}
                    </p>
                  </div>
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <p className="text-sm font-medium text-primary">{t("chat.reasoning")}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("chat.sources")}
                    </p>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-4 -right-4 -z-10 h-full w-full rounded-2xl focus-gradient opacity-20" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="mx-auto max-w-2xl rounded-3xl focus-gradient p-12">
            <h2 className="mb-4 text-3xl font-bold text-primary-foreground md:text-4xl">
              {t("landing.getStarted")}
            </h2>
            <p className="mb-8 text-lg text-primary-foreground/80">
              {t("landing.description")}
            </p>
            <Link to="/auth?mode=signup">
              <Button size="lg" variant="secondary" className="px-8 text-lg">
                {t("landing.getStarted")}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} {t("landing.title")}. {t("landing.subtitle")}.</p>
        </div>
      </footer>
    </div>
  );
}
