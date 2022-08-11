const express = require("express");
const cors = require("cors");

const { v4: uuidv4, validate } = require("uuid");

const app = express();
app.use(express.json());
app.use(cors());

const users = [];

function checksExistsUserAccount(req, res, next) {
  const { username } = req.headers;

  const user = users.find(user => user.username === username);

  if(!user) {
    return res.status(404).json({ "error": "Usuário não encontrado." });
  } else {
    req.user = user;
    return next();
  }

}

function checksCreateTodosUserAvailability(req, res, next) {
  const { user } = req;
  const plan = user.pro;
  const todoQuantity = user.todos;

  if(plan) {
    next();
  } else if(todoQuantity.length < 10) {
    next();
  } else {
    res.status(403).json({ "error:": "Você atingiu o limite de todos cadastrados." });
  }

}

function checksTodoExists(req, res, next) {
  const { username } = req.headers;
  const { id } = req.params;
  
  const user = users.find(user => user.username === username);

  if(!user) {
    return res.status(404).json({ "error": "Usuário não encontrado." });
  }
  
  const isUUID = /^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i.test(id);
  
  if(!isUUID) {
    res.status(400).json({ "error:": "O ID informado não é um uuid." });
  }

  const todo = user.todos.find(todo => todo.id === id);

  if(todo == undefined) {
    return res.status(404).json({ "error": "Todo não encontrado." });
  } else {
    req.user = user;
    req.todo = todo;
    next();
  }
  
}

function findUserById(req, res, next) {
  const { id } = req.params;

  const user = users.find(user => user.id === id);

  if(!user) {
    return res.status(404).json({ "error": "Usuário não encontrado." });
  } else {
    req.user = user;
    return next();
  }

}

app.post("/users", (req, res) => {
  const { name, username } = req.body;

  const usernameAlreadyExists = users.some((user) => user.username === username);

  if (usernameAlreadyExists) {
    return res.status(400).json({ error: "Username already exists" });
  }

  const user = {
    id: uuidv4(),
    name,
    username,
    pro: false,
    todos: []
  };

  users.push(user);

  return res.status(201).json(user);
});

app.get("/users/:id", findUserById, (req, res) => {
  const { user } = req;

  return res.json(user);
});

app.patch("/users/:id/pro", findUserById, (req, res) => {
  const { user } = req;

  if (user.pro) {
    return res.status(400).json({ error: "Pro plan is already activated." });
  }

  user.pro = true;

  return res.json(user);
});

app.get("/todos", checksExistsUserAccount, (req, res) => {
  const { user } = req;

  return res.json(user.todos);
});

app.post("/todos", checksExistsUserAccount, checksCreateTodosUserAvailability, (req, res) => {
  const { title, deadline } = req.body;
  const { user } = req;

  const newTodo = {
    id: uuidv4(),
    title,
    deadline: new Date(deadline),
    done: false,
    created_at: new Date()
  };

  user.todos.push(newTodo);

  return res.status(201).json(newTodo);
});

app.put("/todos/:id", checksTodoExists, (req, res) => {
  const { title, deadline } = req.body;
  const { todo } = req;

  todo.title = title;
  todo.deadline = new Date(deadline);

  return res.json(todo);
});

app.patch("/todos/:id/done", checksTodoExists, (req, res) => {
  const { todo } = req;

  todo.done = true;

  return res.json(todo);
});

app.delete("/todos/:id", checksExistsUserAccount, checksTodoExists, (req, res) => {
  const { user, todo } = req;

  const todoIndex = user.todos.indexOf(todo);

  if (todoIndex === -1) {
    return res.status(404).json({ error: "Todo not found" });
  }

  user.todos.splice(todoIndex, 1);

  return res.status(204).send();
});

module.exports = {
  app,
  users,
  checksExistsUserAccount,
  checksCreateTodosUserAvailability,
  checksTodoExists,
  findUserById
};