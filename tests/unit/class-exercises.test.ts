import { describe, expect, test } from "bun:test";
import { assertExerciseEditable, groupExercisesByLesson, validateExerciseInput } from "../../lib/class-exercise-rules";

const valid = () => ({
  classId: "class-a", lessonId: "lesson-a", title: "Variáveis", question: "Qual tipo aceita true ou false?",
  explanation: "boolean guarda um valor lógico verdadeiro ou falso.",
  options: [{ id: "a", text: "boolean" }, { id: "b", text: "String" }], correctOption: "a",
  correctXp: 20, correctCoins: 15, attemptXp: 5, attemptCoins: 2,
});

describe("regras dos exercícios de turma", () => {
  test("normaliza pergunta, explicação e alternativas", () => {
    const result = validateExerciseInput({ ...valid(), title: " Variáveis ", explanation: " Resposta lógica. ", options: [{ id: "a", text: " boolean " }, { id: "b", text: " String " }] });
    expect(result.title).toBe("Variáveis");
    expect(result.explanation).toBe("Resposta lógica.");
    expect(result.options[0].text).toBe("boolean");
  });

  test("recusa aula ausente, alternativas inválidas e gabarito inexistente", () => {
    expect(() => validateExerciseInput({ ...valid(), lessonId: "" })).toThrow("aula");
    expect(() => validateExerciseInput({ ...valid(), options: [{ id: "a", text: "" }, { id: "a", text: "duplicada" }] })).toThrow("alternativas");
    expect(() => validateExerciseInput({ ...valid(), correctOption: "c" })).toThrow("correta");
  });

  test("recompensa de acerto supera tentativa e explicação respeita o limite", () => {
    expect(() => validateExerciseInput({ ...valid(), correctXp: 5 })).toThrow("maior");
    expect(() => validateExerciseInput({ ...valid(), correctCoins: 2 })).toThrow("maior");
    expect(() => validateExerciseInput({ ...valid(), explanation: "x".repeat(1201) })).toThrow("1.200");
  });

  test("permite editar enquanto ninguém respondeu e bloqueia depois da primeira resposta", () => {
    expect(() => assertExerciseEditable(0)).not.toThrow();
    expect(() => assertExerciseEditable(1)).toThrow("não pode mais ser alterada");
  });

  test("agrupa questões pela identidade da aula e mantém turmas diferentes separadas", () => {
    const groups = groupExercisesByLesson([
      { id: "1", classId: "c1", className: "Java", lessonId: "l1", lessonTitle: "Variáveis" },
      { id: "2", classId: "c1", className: "Java", lessonId: "l1", lessonTitle: "Variáveis" },
      { id: "3", classId: "c2", className: "Java", lessonId: "l1", lessonTitle: "Variáveis" },
    ]);
    expect(groups).toHaveLength(2);
    expect(groups[0].items).toHaveLength(2);
  });
});
