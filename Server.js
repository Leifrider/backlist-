require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();

// ======================================
// CONFIGURAÇÕES
// ======================================

const PORT = process.env.PORT || 3000;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error(
    "SUPABASE_URL e SUPABASE_KEY são obrigatórios."
  );
}

// ======================================
// CONEXÃO COM SUPABASE
// ======================================

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// ======================================
// MIDDLEWARES
// ======================================

app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: "1mb" }));

// ======================================
// ROTA PRINCIPAL
// ======================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "API de tarefas funcionando!",
    version: "1.0.0",
    endpoints: {
      listar: "GET /tasks",
      buscar: "GET /tasks/:id",
      criar: "POST /tasks",
      atualizar: "PUT /tasks/:id",
      excluir: "DELETE /tasks/:id"
    }
  });
});

// ======================================
// HEALTH CHECK
// ======================================

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "online"
  });
});

// ======================================
// CREATE - CRIAR TAREFA
// POST /tasks
// ======================================

app.post("/tasks", async (req, res) => {
  try {
    const { title, description } = req.body;

    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({
        success: false,
        error: "O título é obrigatório."
      });
    }

    if (
      description !== undefined &&
      typeof description !== "string"
    ) {
      return res.status(400).json({
        success: false,
        error: "A descrição deve ser um texto."
      });
    }

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        title: title.trim(),
        description: description || "",
        completed: false
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({
      success: true,
      message: "Tarefa criada com sucesso!",
      data
    });

  } catch (error) {
    console.error("Erro ao criar tarefa:", error);

    return res.status(500).json({
      success: false,
      error: "Erro ao criar tarefa."
    });
  }
});

// ======================================
// READ - LISTAR TODAS AS TAREFAS
// GET /tasks
// ======================================

app.get("/tasks", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return res.status(200).json({
      success: true,
      total: data.length,
      data
    });

  } catch (error) {
    console.error("Erro ao listar tarefas:", error);

    return res.status(500).json({
      success: false,
      error: "Erro ao listar tarefas."
    });
  }
});

// ======================================
// READ - BUSCAR TAREFA POR ID
// GET /tasks/:id
// ======================================

app.get("/tasks/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        error: "ID inválido."
      });
    }

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        error: "Tarefa não encontrada."
      });
    }

    return res.status(200).json({
      success: true,
      data
    });

  } catch (error) {
    console.error("Erro ao buscar tarefa:", error);

    return res.status(500).json({
      success: false,
      error: "Erro ao buscar tarefa."
    });
  }
});

// ======================================
// UPDATE - ATUALIZAR TAREFA
// PUT /tasks/:id
// ======================================

app.put("/tasks/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        error: "ID inválido."
      });
    }

    const { title, description, completed } = req.body;

    const updates = {};

    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        return res.status(400).json({
          success: false,
          error: "Título inválido."
        });
      }

      updates.title = title.trim();
    }

    if (description !== undefined) {
      if (typeof description !== "string") {
        return res.status(400).json({
          success: false,
          error: "Descrição inválida."
        });
      }

      updates.description = description;
    }

    if (completed !== undefined) {
      if (typeof completed !== "boolean") {
        return res.status(400).json({
          success: false,
          error: "completed deve ser true ou false."
        });
      }

      updates.completed = completed;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: "Informe os campos que deseja atualizar."
      });
    }

    const { data, error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        error: "Tarefa não encontrada."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Tarefa atualizada com sucesso!",
      data
    });

  } catch (error) {
    console.error("Erro ao atualizar tarefa:", error);

    return res.status(500).json({
      success: false,
      error: "Erro ao atualizar tarefa."
    });
  }
});

// ======================================
// DELETE - EXCLUIR TAREFA
// DELETE /tasks/:id
// ======================================

app.delete("/tasks/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        error: "ID inválido."
      });
    }

    const { data, error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        error: "Tarefa não encontrada."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Tarefa excluída com sucesso!",
      data
    });

  } catch (error) {
    console.error("Erro ao excluir tarefa:", error);

    return res.status(500).json({
      success: false,
      error: "Erro ao excluir tarefa."
    });
  }
});

// ======================================
// ROTA NÃO ENCONTRADA
// ======================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint não encontrado."
  });
});

// ======================================
// EXPORTAÇÃO PARA VERCEL
// ======================================

module.exports = app;

// ======================================
// EXECUÇÃO LOCAL
// ======================================

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}
