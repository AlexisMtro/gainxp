import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Link, router } from 'expo-router';
import { useState, useCallback } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

// ─── Validation ────────────────────────────────────────────────────────────────

const EMAIL_REGEX    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

function validateUsername(v: string): string | null {
  if (!v) return 'Le pseudo est requis.';
  if (!USERNAME_REGEX.test(v))
    return '3–20 caractères, lettres, chiffres ou _ uniquement.';
  return null;
}

function validateEmail(v: string): string | null {
  if (!v) return "L'email est requis.";
  if (!EMAIL_REGEX.test(v)) return 'Email invalide.';
  return null;
}

function validatePassword(v: string): string | null {
  if (!v) return 'Le mot de passe est requis.';
  if (v.length < 8) return 'Minimum 8 caractères.';
  return null;
}

function validateConfirm(password: string, confirm: string): string | null {
  if (!confirm) return 'Confirme ton mot de passe.';
  if (confirm !== password) return 'Les mots de passe ne correspondent pas.';
  return null;
}

function mapSignUpError(message: string): string {
  if (message.includes('User already registered')) return 'Cet email est déjà utilisé.';
  if (message.includes('Password should be'))      return 'Mot de passe trop faible.';
  if (message.includes('Unable to validate'))      return 'Email invalide.';
  return 'Inscription échouée. Réessaie plus tard.';
}

// ─── Composant champ de saisie ─────────────────────────────────────────────────

interface InputFieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  onBlur?: () => void;
  placeholder: string;
  error?: string | null;
  hint?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences';
  autoComplete?: 'email' | 'password' | 'new-password' | 'username' | 'off';
  isLoading?: boolean;
}

function InputField({
  label,
  value,
  onChangeText,
  onBlur,
  placeholder,
  error,
  hint,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoComplete = 'off',
  isLoading = false,
}: InputFieldProps) {
  const hasError = !!error;
  const borderColor = hasError ? 'border border-red-500/50' : 'border border-transparent';

  return (
    <View className="mb-4">
      <Text className="text-gray-400 text-sm mb-1 ml-1">{label}</Text>
      <View className={`bg-background-elevated rounded-2xl ${borderColor}`}>
        <TextInput
          className="text-white px-4 py-4 text-base"
          placeholder={placeholder}
          placeholderTextColor="#4B5563"
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          autoCorrect={false}
        />
      </View>
      {/* Erreur ou hint sous le champ */}
      {hasError && (
        <Text className="text-red-400 text-xs mt-1 ml-1">{error}</Text>
      )}
      {!hasError && hint && isLoading && (
        <Text className="text-gray-500 text-xs mt-1 ml-1">{hint}</Text>
      )}
    </View>
  );
}

// ─── Indicateur de force du mot de passe ──────────────────────────────────────

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;

  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^a-zA-Z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;

  const colors  = ['#EF4444', '#F97316', '#F59E0B', '#10B981'];
  const labels  = ['Faible', 'Moyen', 'Bon', 'Fort'];
  const color   = colors[score - 1] ?? '#EF4444';
  const label   = labels[score - 1] ?? 'Faible';

  return (
    <View className="mb-4 -mt-2">
      <View className="flex-row gap-1 mb-1">
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            className="flex-1 h-1 rounded-full"
            style={{ backgroundColor: i < score ? color : '#252540' }}
          />
        ))}
      </View>
      <Text className="text-xs ml-1" style={{ color }}>
        Sécurité : {label}
      </Text>
    </View>
  );
}

// ─── Écran ────────────────────────────────────────────────────────────────────

export default function RegisterScreen() {
  const [username, setUsername]         = useState('');
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [confirm, setConfirm]           = useState('');

  // Erreurs par champ (affichées après blur)
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [emailError, setEmailError]       = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError]   = useState<string | null>(null);
  const [globalError, setGlobalError]     = useState<string | null>(null);

  // État de la vérification d'unicité du pseudo
  const [checkingUsername, setCheckingUsername] = useState(false);

  const { signUp, isLoading } = useAuthStore();

  // ── Validation username avec vérification unicité Supabase ────────────────
  const handleUsernameBlur = useCallback(async () => {
    const err = validateUsername(username);
    if (err) { setUsernameError(err); return; }

    setCheckingUsername(true);
    setUsernameError(null);
    try {
      const { data } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('username', username.trim())
        .maybeSingle();

      if (data) setUsernameError('Ce pseudo est déjà pris.');
    } finally {
      setCheckingUsername(false);
    }
  }, [username]);

  // ── Handlers de validation au blur ────────────────────────────────────────
  const handleEmailBlur    = () => setEmailError(validateEmail(email));
  const handlePasswordBlur = () => setPasswordError(validatePassword(password));
  const handleConfirmBlur  = () => setConfirmError(validateConfirm(password, confirm));

  // ── Soumission du formulaire ───────────────────────────────────────────────
  const handleRegister = async () => {
    setGlobalError(null);

    // Validation complète avant envoi
    const uErr = validateUsername(username);
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    const cErr = validateConfirm(password, confirm);

    setUsernameError(uErr);
    setEmailError(eErr);
    setPasswordError(pErr);
    setConfirmError(cErr);

    if (uErr || eErr || pErr || cErr || checkingUsername) return;

    try {
      await signUp(email.trim(), password, username.trim());
      router.replace('/(tabs)');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setGlobalError(mapSignUpError(message));
    }
  };

  const isDisabled =
    isLoading ||
    checkingUsername ||
    !username ||
    !email ||
    !password ||
    !confirm;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── En-tête ── */}
        <LinearGradient
          colors={['#1A1040', '#0F0F1A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="items-center pt-16 pb-10 px-6"
        >
          <LinearGradient
            colors={['#6C63FF', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="w-16 h-16 rounded-2xl items-center justify-center mb-4"
          >
            <Text className="text-white text-3xl font-bold">G</Text>
          </LinearGradient>
          <Text className="text-white text-3xl font-bold tracking-tight">
            Gain<Text className="text-primary">XP</Text>
          </Text>
          <Text className="text-gray-400 text-sm text-center mt-2">
            Crée ton compte et commence à progresser.
          </Text>
        </LinearGradient>

        {/* ── Formulaire ── */}
        <View className="flex-1 px-6 pt-6">
          <Text className="text-white text-2xl font-bold mb-6">Inscription</Text>

          {/* Erreur globale */}
          {globalError && (
            <View className="bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-3 mb-5">
              <Text className="text-red-400 text-sm">{globalError}</Text>
            </View>
          )}

          <InputField
            label="Pseudo"
            value={username}
            onChangeText={(v) => { setUsername(v); setUsernameError(null); }}
            onBlur={handleUsernameBlur}
            placeholder="ton_pseudo"
            error={usernameError}
            hint={checkingUsername ? 'Vérification...' : undefined}
            isLoading={checkingUsername}
            autoComplete="username"
          />

          <InputField
            label="Email"
            value={email}
            onChangeText={(v) => { setEmail(v); setEmailError(null); }}
            onBlur={handleEmailBlur}
            placeholder="ton@email.com"
            error={emailError}
            keyboardType="email-address"
            autoComplete="email"
          />

          <InputField
            label="Mot de passe"
            value={password}
            onChangeText={(v) => { setPassword(v); setPasswordError(null); }}
            onBlur={handlePasswordBlur}
            placeholder="••••••••"
            error={passwordError}
            secureTextEntry
            autoComplete="new-password"
          />

          {/* Indicateur de force */}
          <PasswordStrength password={password} />

          <InputField
            label="Confirmer le mot de passe"
            value={confirm}
            onChangeText={(v) => { setConfirm(v); setConfirmError(null); }}
            onBlur={handleConfirmBlur}
            placeholder="••••••••"
            error={confirmError}
            secureTextEntry
            autoComplete="new-password"
          />

          {/* Bouton inscription */}
          <TouchableOpacity
            onPress={handleRegister}
            disabled={isDisabled}
            activeOpacity={0.85}
            className="mt-2"
          >
            <LinearGradient
              colors={isDisabled ? ['#3D3A6B', '#3D3A6B'] : ['#6C63FF', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="rounded-2xl py-4 items-center"
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-white font-bold text-base">Créer mon compte</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Lien connexion */}
          <View className="flex-row justify-center mt-8 mb-8">
            <Text className="text-gray-400 text-sm">Déjà un compte ? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text className="text-primary font-semibold text-sm">Se connecter</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
