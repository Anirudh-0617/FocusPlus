import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";
import { User, Bell, Moon, Target, Save, Loader2, Globe } from "lucide-react";
import type { Language } from "@/i18n";

interface Profile {
  full_name: string | null;
  study_goal: string | null;
  daily_focus_hours: number | null;
  notification_enabled: boolean | null;
  theme_preference: string | null;
}

export default function Settings() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { t, language, setLanguage, languageNames } = useLanguage();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile>({
    full_name: "",
    study_goal: "",
    daily_focus_hours: 4,
    notification_enabled: true,
    theme_preference: null,
  });

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      
      if (data) {
        setProfile({
          full_name: data.full_name || "",
          study_goal: data.study_goal || "",
          daily_focus_hours: data.daily_focus_hours || 4,
          notification_enabled: data.notification_enabled ?? true,
          theme_preference: data.theme_preference || "dark",
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user!.id)
        .maybeSingle();

      const profileData = {
        user_id: user!.id,
        full_name: profile.full_name,
        study_goal: profile.study_goal,
        daily_focus_hours: profile.daily_focus_hours,
        notification_enabled: profile.notification_enabled,
        theme_preference: profile.theme_preference,
        updated_at: new Date().toISOString(),
      };

      let error;
      if (existing) {
        ({ error } = await supabase
          .from("profiles")
          .update(profileData)
          .eq("user_id", user!.id));
      } else {
        ({ error } = await supabase
          .from("profiles")
          .insert(profileData));
      }

      if (error) throw error;
      toast({ title: t("settings.profileUpdated") });
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({ title: t("settings.updateError"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    // Only apply theme when explicitly set (not null), prevents flash on initial load
    if (profile.theme_preference === null) return;
    
    if (profile.theme_preference === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [profile.theme_preference]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{t("settings.title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("settings.preferences")}</p>
        </div>

        <div className="space-y-6">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {t("settings.profile")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input id="email" value={user?.email || ""} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">{t("settings.fullName")}</Label>
                <Input
                  id="fullName"
                  value={profile.full_name || ""}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Study Goals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                {t("settings.studyGoal")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="studyGoal">{t("settings.studyGoal")}</Label>
                <Input
                  id="studyGoal"
                  value={profile.study_goal || ""}
                  onChange={(e) => setProfile({ ...profile, study_goal: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dailyHours">{t("settings.dailyFocusHours")}</Label>
                <Select
                  value={String(profile.daily_focus_hours)}
                  onValueChange={(value) =>
                    setProfile({ ...profile, daily_focus_hours: parseInt(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((hours) => (
                      <SelectItem key={hours} value={String(hours)}>
                        {hours} hour{hours > 1 ? "s" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Language Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                {t("settings.language")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t("settings.language")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("settings.currentLanguage")} <strong>{languageNames[language]}</strong>
                  </p>
                  <p className="text-xs text-muted-foreground">{t("settings.languageNote")}</p>
                </div>
                <Select
                  value={language}
                  onValueChange={(value) => setLanguage(value as Language)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(languageNames) as [Language, string][]).map(([code, name]) => (
                      <SelectItem key={code} value={code}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Moon className="h-5 w-5" />
                {t("settings.preferences")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t("settings.theme")}</Label>
                </div>
                <Select
                  value={profile.theme_preference || "dark"}
                  onValueChange={(value) => setProfile({ ...profile, theme_preference: value })}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">{t("settings.themeLight")}</SelectItem>
                    <SelectItem value="dark">{t("settings.themeDark")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    {t("settings.notifications")}
                  </Label>
                </div>
                <Switch
                  checked={profile.notification_enabled ?? true}
                  onCheckedChange={(checked) =>
                    setProfile({ ...profile, notification_enabled: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-between">
            <Button variant="destructive" onClick={handleLogout}>
              {t("nav.logout")}
            </Button>
            <Button onClick={saveProfile} disabled={saving} className="focus-gradient gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t("settings.saveChanges")}
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
