import * as z from "zod/mini";

const MAX_MESSAGE_LENGTH = 1000;

export const EchoRequestSchema = z.strictObject(
  {
    message: z
      .string("message is required and must be a string")
      .check(
        z.minLength(1, "message must not be empty"),
        z.maxLength(
          MAX_MESSAGE_LENGTH,
          `message must be ${String(MAX_MESSAGE_LENGTH)} characters or fewer`,
        ),
      ),
  },
  "unexpected field in request body",
);

// Enum of string literals, not z.boolean(): query values arrive as strings.
export const EchoQuerySchema = z.strictObject(
  {
    uppercase: z.optional(
      z.enum(["true", "false"], 'uppercase must be "true" or "false"'),
    ),
  },
  "unexpected query parameter",
);

/** @internal Asserted only by the worker-api Vitest suite. */
export const EchoResponseSchema = z.strictObject({
  message: z.string(),
  receivedAt: z.iso.datetime(),
  requestId: z.string(),
});

export type EchoResponse = z.infer<typeof EchoResponseSchema>;
