const { z } = require('zod');

function validateBody(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: err.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
        });
      }
      next(err);
    }
  };
}

// Common Zod Schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name is required'),
  role: z.enum(['USER', 'ADMIN']).optional().default('USER')
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

const chatSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty'),
  conversationId: z.string().optional()
});

const createConversationSchema = z.object({
  title: z.string().optional()
});

const renameConversationSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty')
});

const documentSchema = z.object({
  docId: z.string().optional(),
  title: z.string().min(2, 'Title is required'),
  category: z.string().min(2, 'Category is required'),
  content: z.string().min(10, 'Content must be at least 10 characters'),
  source: z.string().optional(),
  status: z.enum(['DRAFT', 'APPROVED', 'ACTIVE', 'ARCHIVED']).optional().default('DRAFT')
});

module.exports = {
  validateBody,
  registerSchema,
  loginSchema,
  chatSchema,
  createConversationSchema,
  renameConversationSchema,
  documentSchema
};
