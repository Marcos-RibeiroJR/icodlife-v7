"use client";
// apps/web/src/app/auth/register/page.tsx
// Cadastro completo: Masculino/Feminino, Termos LGPD, Familiar

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "../../../lib/api";

type Step = "personal" | "health" | "emergency" | "terms" | "done";
type Gender = "male" | "female" | "other";

const bloodTypes = ["A+","A-","B+","B-","AB+","AB-","O+","O-","Não sei"];

const STATES = [
  {uf:"SP",name:"São Paulo"},{uf:"AC",name:"Acre"},{uf:"AL",name:"Alagoas"},
  {uf:"AM",name:"Amazonas"},{uf:"AP",name:"Amapá"},{uf:"BA",name:"Bahia"},
  {uf:"CE",name:"Ceará"},{uf:"DF",name:"Distrito Federal"},{uf:"ES",name:"Espírito Santo"},
  {uf:"GO",name:"Goiás"},{uf:"MA",name:"Maranhão"},{uf:"MG",name:"Minas Gerais"},
  {uf:"MS",name:"Mato Grosso do Sul"},{uf:"MT",name:"Mato Grosso"},{uf:"PA",name:"Pará"},
  {uf:"PB",name:"Paraíba"},{uf:"PE",name:"Pernambuco"},{uf:"PI",name:"Piauí"},
  {uf:"PR",name:"Paraná"},{uf:"RJ",name:"Rio de Janeiro"},{uf:"RN",name:"Rio Grande do Norte"},
  {uf:"RO",name:"Rondônia"},{uf:"RR",name:"Roraima"},{uf:"RS",name:"Rio Grande do Sul"},
  {uf:"SC",name:"Santa Catarina"},{uf:"SE",name:"Sergipe"},{uf:"TO",name:"Tocantins"},
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("personal");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generatedIcode, setGeneratedIcode] = useState("");

  const [form, setForm] = useState({
    fullName: "", email: "", password: "", confirmPassword: "",
    dateOfBirth: "", gender: "" as Gender | "",
    phone: "", bloodType: "Não sei", isDonor: false, stateUf: "",
    // saúde
    allergies: "", chronicConditions: "",
    // emergência
    emergencyContactName: "", emergencyContactPhone: "", emergencyContactRel: "",
    // termos
    acceptedTerms: false, acceptedDataProcessing: false, acceptedMarketing: false,
  });

  const set = (field: string, value: any) =>
    setForm(f => ({ ...f, [field]: value }));

  const next = () => {
    if (step === "personal") setStep("health");
    else if (step === "health") setStep("emergency");
    else if (step === "emergency") setStep("terms");
  };
  const back = () => {
    if (step === "health") setStep("personal");
    else if (step === "emergency") setStep("health");
    else if (step === "terms") setStep("emergency");
  };

  const submit = async () => {
    if (!form.acceptedTerms || !form.acceptedDataProcessing) {
      setError("Você deve aceitar os termos obrigatórios para continuar.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("As senhas não coincidem."); return;
    }
    // Validação de senha no frontend antes de enviar
    const pwRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/;
    if (!pwRegex.test(form.password)) {
      setError("A senha precisa ter: letra maiúscula, minúscula, número e símbolo (@$!%*?&). Ex: Marcos@123");
      return;
    }
    setLoading(true); setError("");
    try {
      const { confirmPassword: _, ...payload } = form;
      const res = await authApi.register({
        ...payload,
        bloodType: form.bloodType === "Não sei" ? "unknown" : form.bloodType,
        allergies: form.allergies.split(",").map(s=>s.trim()).filter(Boolean),
        chronicConditions: form.chronicConditions.split(",").map(s=>s.trim()).filter(Boolean),
      });
      if (res.data?.icode) setGeneratedIcode(res.data.icode);
      setStep("done");
    } catch(e: any) {
      const msg = e.response?.data?.message;
      // class-validator retorna array de mensagens
      setError(Array.isArray(msg) ? msg.join(" | ") : (msg || "Erro ao cadastrar. Tente novamente."));
    } finally { setLoading(false); }
  };

  const steps = ["personal","health","emergency","terms"];
  const stepIdx = steps.indexOf(step);

  if (step === "done") return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={{ fontSize: 48, textAlign: "center", margin: "16px 0" }}>✅</div>
        <h2 style={styles.title}>Cadastro realizado!</h2>
        {generatedIcode && (
          <div style={{ background: "#7B1E1E", borderRadius: 12, padding: "16px 20px", margin: "16px 0", textAlign: "center" }}>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>Seu ICODE — guarde com segurança</div>
            <div style={{ color: "#fff", fontSize: 22, fontWeight: 800, letterSpacing: 4, fontFamily: "monospace" }}>{generatedIcode}</div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 6 }}>Este código é único, permanente e não pode ser alterado.</div>
          </div>
        )}
        <p style={styles.sub}>Faça login para acessar sua conta.</p>
        <button style={styles.btn} onClick={() => router.push("/auth/login")}>
          Ir para Login
        </button>
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Progress */}
        <div style={styles.progress}>
          {steps.map((s, i) => (
            <div key={s} style={{
              ...styles.progressDot,
              background: i <= stepIdx ? "#0066CC" : "#E2E8F0"
            }} />
          ))}
        </div>
        <div style={styles.progressLabel}>
          {step === "personal" ? "Dados Pessoais" :
           step === "health" ? "Saúde" :
           step === "emergency" ? "Emergência" : "Termos e Privacidade"}
        </div>

        <div style={styles.header}>
          <div style={styles.logoLine}>
            <span style={styles.logo}>❤️</span>
            <span style={styles.logoText}>IcodLife</span>
          </div>
          <h1 style={styles.h1}>Criar conta</h1>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        {/* STEP 1 — DADOS PESSOAIS */}
        {step === "personal" && (
          <div>
            <label style={styles.label}>Nome completo *</label>
            <input style={styles.input} value={form.fullName}
              onChange={e => set("fullName", e.target.value)} placeholder="João Carlos Silva" />

            <label style={styles.label}>E-mail *</label>
            <input style={styles.input} type="email" value={form.email}
              onChange={e => set("email", e.target.value)} placeholder="joao@email.com" />

            <label style={styles.label}>Senha *</label>
            <input style={styles.input} type="password" value={form.password}
              onChange={e => set("password", e.target.value)} placeholder="Mín. 8 caracteres" />
            <p style={styles.hint}>Deve conter maiúscula, minúscula, número e símbolo</p>

            <label style={styles.label}>Confirmar senha *</label>
            <input style={styles.input} type="password" value={form.confirmPassword}
              onChange={e => set("confirmPassword", e.target.value)} placeholder="Repita a senha" />

            <label style={styles.label}>Data de nascimento *</label>
            <input style={styles.input} type="date" value={form.dateOfBirth}
              onChange={e => set("dateOfBirth", e.target.value)} />

            <label style={styles.label}>Gênero *</label>
            <div style={styles.genderRow}>
              {[
                { v: "male", label: "♂ Masculino" },
                { v: "female", label: "♀ Feminino" },
                { v: "other", label: "⊕ Outro" }
              ].map(g => (
                <button key={g.v} type="button"
                  style={{ ...styles.genderBtn, ...(form.gender === g.v ? styles.genderBtnActive : {}) }}
                  onClick={() => set("gender", g.v)}>
                  {g.label}
                </button>
              ))}
            </div>

            {form.gender === "female" && (
              <div style={styles.femaleBadge}>
                ♀ Você terá acesso ao módulo de controle de ciclo menstrual
              </div>
            )}

            <label style={styles.label}>Telefone</label>
            <input style={styles.input} value={form.phone}
              onChange={e => set("phone", e.target.value)} placeholder="+55 11 99999-9999" />

            <label style={styles.label}>Estado *</label>
            <select style={styles.select} value={form.stateUf}
              onChange={e => set("stateUf", e.target.value)}>
              <option value="">Selecione seu estado...</option>
              {STATES.map(s => <option key={s.uf} value={s.uf}>{s.name} ({s.uf})</option>)}
            </select>
            <p style={styles.hint}>Usado para gerar seu ICODE único</p>

            <label style={styles.label}>Tipo sanguíneo</label>
            <select style={styles.select} value={form.bloodType}
              onChange={e => set("bloodType", e.target.value)}>
              {bloodTypes.map(b => <option key={b}>{b}</option>)}
            </select>

            <label style={styles.checkRow}>
              <input type="checkbox" checked={form.isDonor}
                onChange={e => set("isDonor", e.target.checked)} style={{ marginRight: 8 }} />
              Sou doador(a) de órgãos
            </label>

            <button style={styles.btn} disabled={!form.fullName || !form.email || !form.gender || !form.dateOfBirth}
              onClick={next}>
              Próximo →
            </button>
          </div>
        )}

        {/* STEP 2 — SAÚDE */}
        {step === "health" && (
          <div>
            <p style={styles.sectionNote}>
              Informações opcionais que ajudam em emergências e compartilhamento com médicos.
              Tudo é protegido pela LGPD.
            </p>

            <label style={styles.label}>Alergias</label>
            <input style={styles.input} value={form.allergies}
              onChange={e => set("allergies", e.target.value)}
              placeholder="Penicilina, látex, amendoim... (separadas por vírgula)" />

            <label style={styles.label}>Condições crônicas</label>
            <input style={styles.input} value={form.chronicConditions}
              onChange={e => set("chronicConditions", e.target.value)}
              placeholder="Hipertensão, diabetes... (separadas por vírgula)" />

            {form.gender === "female" && (
              <div style={styles.femaleBadge}>
                ♀ Após o cadastro você poderá usar o módulo de Ciclo Menstrual com calendário,
                predição de ovulação e diário de sintomas.
              </div>
            )}

            <div style={styles.btnRow}>
              <button style={styles.btnSecondary} onClick={back}>← Voltar</button>
              <button style={styles.btn} onClick={next}>Próximo →</button>
            </div>
          </div>
        )}

        {/* STEP 3 — EMERGÊNCIA */}
        {step === "emergency" && (
          <div>
            <p style={styles.sectionNote}>
              Dados exibidos em situações de emergência (sem login necessário).
            </p>

            <label style={styles.label}>Nome do contato de emergência</label>
            <input style={styles.input} value={form.emergencyContactName}
              onChange={e => set("emergencyContactName", e.target.value)}
              placeholder="Maria Silva" />

            <label style={styles.label}>Telefone de emergência</label>
            <input style={styles.input} value={form.emergencyContactPhone}
              onChange={e => set("emergencyContactPhone", e.target.value)}
              placeholder="+55 11 99999-9999" />

            <label style={styles.label}>Relação</label>
            <select style={styles.select} value={form.emergencyContactRel}
              onChange={e => set("emergencyContactRel", e.target.value)}>
              <option value="">Selecione...</option>
              <option>Cônjuge/Parceiro(a)</option>
              <option>Pai</option>
              <option>Mãe</option>
              <option>Filho(a)</option>
              <option>Irmão/Irmã</option>
              <option>Amigo(a)</option>
              <option>Outro</option>
            </select>

            <div style={styles.btnRow}>
              <button style={styles.btnSecondary} onClick={back}>← Voltar</button>
              <button style={styles.btn} onClick={next}>Próximo →</button>
            </div>
          </div>
        )}

        {/* STEP 4 — TERMOS */}
        {step === "terms" && (
          <div>
            <div style={styles.termsBox}>
              <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>Termos de Uso e Privacidade</h3>
              <p style={{ fontSize: 13, color: "#555", lineHeight: 1.6 }}>
                O IcodLife armazena seus dados de saúde com criptografia AES-256, em servidores
                localizados no Brasil (AWS sa-east-1). Seus dados são de sua propriedade
                exclusiva. Você pode exportá-los, corrigi-los ou excluí-los a qualquer momento,
                em conformidade com a LGPD (Lei 13.709/2018).
              </p>
              <p style={{ fontSize: 13, color: "#555", lineHeight: 1.6 }}>
                Dados anonimizados podem ser utilizados de forma agregada para pesquisas de saúde
                pública, sem possibilidade de identificação individual. Você pode revogar este
                consentimento a qualquer momento nas configurações.
              </p>
            </div>

            <label style={styles.checkRow}>
              <input type="checkbox" checked={form.acceptedTerms}
                onChange={e => set("acceptedTerms", e.target.checked)} style={{ marginRight: 8 }} />
              <span>
                <strong>* Li e aceito os</strong>{" "}
                <a href="/terms" target="_blank" style={{ color: "#0066CC" }}>Termos de Uso</a>
              </span>
            </label>

            <label style={styles.checkRow}>
              <input type="checkbox" checked={form.acceptedDataProcessing}
                onChange={e => set("acceptedDataProcessing", e.target.checked)} style={{ marginRight: 8 }} />
              <span>
                <strong>* Autorizo o processamento dos meus dados</strong> para prestação
                do serviço IcodLife, conforme a LGPD (Art. 11)
              </span>
            </label>

            <label style={styles.checkRow}>
              <input type="checkbox" checked={form.acceptedMarketing}
                onChange={e => set("acceptedMarketing", e.target.checked)} style={{ marginRight: 8 }} />
              <span>
                Aceito receber comunicações sobre saúde e novidades do IcodLife{" "}
                <em style={{ color: "#888" }}>(opcional)</em>
              </span>
            </label>

            <p style={{ fontSize: 11, color: "#999", margin: "8px 0 16px" }}>
              * Campos obrigatórios para criação da conta
            </p>

            <div style={styles.btnRow}>
              <button style={styles.btnSecondary} onClick={back}>← Voltar</button>
              <button style={styles.btn} disabled={loading || !form.acceptedTerms || !form.acceptedDataProcessing}
                onClick={submit}>
                {loading ? "Criando conta..." : "Criar conta ✓"}
              </button>
            </div>
          </div>
        )}

        <p style={styles.footer}>
          Já tem conta?{" "}
          <a href="/auth/login" style={{ color: "#0066CC" }}>Entrar</a>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: "100vh", background: "#F4F8FF", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" },
  card: { background: "#fff", borderRadius: 16, padding: "32px 28px", width: "100%", maxWidth: 480, boxShadow: "0 4px 24px rgba(0,63,125,0.08)" },
  header: { marginBottom: 24 },
  logoLine: { display: "flex", alignItems: "center", gap: 8, marginBottom: 12 },
  logo: { fontSize: 24 },
  logoText: { fontWeight: 700, fontSize: 20, color: "#003F7D" },
  h1: { margin: 0, fontSize: 22, fontWeight: 700, color: "#1E293B" },
  progress: { display: "flex", gap: 6, marginBottom: 4 },
  progressDot: { height: 4, flex: 1, borderRadius: 2, transition: "background 0.3s" },
  progressLabel: { fontSize: 11, color: "#888", marginBottom: 20, textTransform: "uppercase", letterSpacing: 1 },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: "#334155", margin: "14px 0 5px" },
  input: { width: "100%", border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "10px 12px", fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" },
  select: { width: "100%", border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "10px 12px", fontSize: 14, outline: "none", boxSizing: "border-box" },
  hint: { fontSize: 11, color: "#94A3B8", margin: "4px 0 0" },
  btn: { width: "100%", background: "#0066CC", color: "#fff", border: "none", borderRadius: 10, padding: "13px", fontSize: 14, fontWeight: 700, cursor: "pointer", marginTop: 20 },
  btnSecondary: { flex: 1, background: "#F1F5F9", color: "#334155", border: "none", borderRadius: 10, padding: "13px", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  btnRow: { display: "flex", gap: 10, marginTop: 20 },
  genderRow: { display: "flex", gap: 8, marginTop: 4 },
  genderBtn: { flex: 1, padding: "10px 4px", border: "1.5px solid #E2E8F0", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 500 },
  genderBtnActive: { background: "#EFF6FF", borderColor: "#0066CC", color: "#0066CC", fontWeight: 700 },
  femaleBadge: { background: "#FDF2F8", border: "1px solid #F9A8D4", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#9D174D", marginTop: 12 },
  sectionNote: { fontSize: 13, color: "#64748B", marginBottom: 4, lineHeight: 1.6 },
  termsBox: { background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: 16, marginBottom: 16 },
  checkRow: { display: "flex", alignItems: "flex-start", gap: 0, margin: "10px 0", fontSize: 13, lineHeight: 1.5, cursor: "pointer" } as any,
  errorBox: { background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#991B1B", marginBottom: 16 },
  footer: { textAlign: "center", marginTop: 20, fontSize: 13, color: "#64748B" },
};
