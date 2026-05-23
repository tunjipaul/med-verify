import type { Express } from "express";
import swaggerUi from "swagger-ui-express";

const errorContent = {
  "application/json": {
    schema: { $ref: "#/components/schemas/ApiError" },
  },
} as const;

const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "MedVerify Backend API",
    version: "1.0.0",
    description: "Core authentication and health endpoints for MedVerify.",
  },
  servers: [{ url: "/api/v1" }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      ApiError: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          code: { type: "string", example: "FORBIDDEN" },
          message: { type: "string", example: "Unauthorized" },
        },
      },
      AuditLog: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          eventType: { type: "string" },
          actorId: { type: "string", format: "uuid", nullable: true },
          actorRole: { type: "string", nullable: true },
          mctCaseId: { type: "string", format: "uuid", nullable: true },
          targetId: { type: "string", format: "uuid", nullable: true },
          payloadSummary: { type: "object", nullable: true, additionalProperties: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      AuditListResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: { $ref: "#/components/schemas/AuditLog" },
              },
              meta: {
                type: "object",
                properties: {
                  total: { type: "integer", example: 24 },
                  page: { type: "integer", example: 1 },
                  limit: { type: "integer", example: 20 },
                  totalPages: { type: "integer", example: 2 },
                },
              },
            },
          },
        },
      },
      AuditItemResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data: { $ref: "#/components/schemas/AuditLog" },
        },
      },
      Hospital: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          state: { type: "string" },
          tier: { type: "string", enum: ["TIER_1", "TIER_2"] },
          approvedRegistryId: { type: "string" },
          isActive: { type: "boolean" },
        },
      },
      HospitalListResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/Hospital" },
          },
        },
      },
      HospitalResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "Hospital created" },
          data: { $ref: "#/components/schemas/Hospital" },
        },
      },
      DoctorAdmin: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          userId: { type: "string", format: "uuid" },
          hospitalId: { type: "string", format: "uuid" },
          mdcnNumber: { type: "string" },
          specialization: { type: "string", nullable: true },
          isActive: { type: "boolean" },
        },
      },
      DoctorListResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data: {
            type: "array",
            items: { $ref: "#/components/schemas/DoctorAdmin" },
          },
        },
      },
      DoctorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "Doctor created" },
          data: { $ref: "#/components/schemas/DoctorAdmin" },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          email: { type: "string", format: "email" },
          role: { type: "string" },
          firstName: { type: "string", nullable: true },
          lastName: { type: "string", nullable: true },
        },
      },
      LoginResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "Login successful" },
          data: {
            type: "object",
            properties: {
              token: { type: "string" },
              csrfToken: { type: "string", description: "Send as x-csrf-token for refresh/logout requests." },
              user: { $ref: "#/components/schemas/User" },
            },
          },
        },
      },
      RefreshResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "Token refreshed" },
          data: {
            type: "object",
            properties: {
              token: { type: "string" },
              csrfToken: { type: "string", description: "Rotated CSRF token for subsequent refresh/logout requests." },
            },
          },
        },
      },
      LogoutResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "Logged out" },
        },
      },
      MeResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data: { $ref: "#/components/schemas/User" },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 6 },
        },
      },
      RefreshRequest: {
        type: "object",
        properties: {
          refreshToken: { type: "string", description: "Optional fallback if cookie is not used." },
        },
      },
      CreateMctCaseRequest: {
        type: "object",
        properties: {
          hospitalId: { type: "string", format: "uuid" },
          doctorId: { type: "string", format: "uuid" },
          referralTag: { type: "boolean", default: false },
          identityMatch: { type: "string", maxLength: 120 },
        },
      },
      TransitionMctCaseStatusRequest: {
        type: "object",
        required: ["nextStatus"],
        properties: {
          nextStatus: {
            type: "string",
            enum: [
              "CREATED",
              "UNDER_REVIEW",
              "REVIEW_REQUIRED",
              "ESCALATED",
              "APPROVED",
              "REJECTED",
              "CLOSED",
            ],
          },
        },
      },
      VerificationCode: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          mctCaseId: { type: "string", format: "uuid" },
          codeValue: {
            type: "string",
            nullable: true,
            example: "MV-12345678",
            description: "Only returned in test mode when ALLOW_TEST_CODE_PLAINTEXT=true.",
          },
          expiresAt: { type: "string", format: "date-time" },
          usedAt: { type: "string", format: "date-time", nullable: true },
          failedAttempts: { type: "integer", example: 0 },
          extensionCount: { type: "integer", example: 0 },
        },
      },
      VerificationCodeResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string" },
          data: { $ref: "#/components/schemas/VerificationCode" },
        },
      },
      ValidateVerificationCodeRequest: {
        type: "object",
        required: ["codeValue"],
        properties: {
          codeValue: { type: "string", example: "MV-12345678" },
        },
      },
      ExtendVerificationCodeRequest: {
        type: "object",
        required: ["verificationCodeId", "extensionReason"],
        properties: {
          verificationCodeId: { type: "string", format: "uuid" },
          extensionReason: { type: "string", minLength: 3, maxLength: 250 },
        },
      },
      Decision: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          mctCaseId: { type: "string", format: "uuid" },
          outcome: { type: "string" },
          riskScore: { type: "integer" },
          reasonText: { type: "string", nullable: true },
          isOverride: { type: "boolean" },
          decidedById: { type: "string", format: "uuid", nullable: true },
        },
      },
      DecisionResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string" },
          data: { $ref: "#/components/schemas/Decision" },
        },
      },
      OverrideDecisionRequest: {
        type: "object",
        required: ["outcome", "reasonText"],
        properties: {
          outcome: {
            type: "string",
            enum: ["AUTO_APPROVE", "REVIEW_REQUIRED", "ESCALATE", "AUTO_REJECT", "APPROVED", "REJECTED"],
          },
          reasonText: { type: "string", minLength: 5, maxLength: 500 },
        },
      },
      MctCase: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          corperId: { type: "string", format: "uuid" },
          hospitalId: { type: "string", format: "uuid", nullable: true },
          doctorId: { type: "string", format: "uuid", nullable: true },
          status: { type: "string", example: "CREATED" },
          riskScore: { type: "integer", example: 0 },
          referralTag: { type: "boolean" },
          identityMatch: { type: "string", nullable: true },
          submittedAt: { type: "string", format: "date-time", nullable: true },
          reviewedAt: { type: "string", format: "date-time", nullable: true },
          closedAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      MctCaseResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "MCT case created" },
          data: { $ref: "#/components/schemas/MctCase" },
        },
      },
      MctCaseListResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: { $ref: "#/components/schemas/MctCase" },
              },
              meta: {
                type: "object",
                properties: {
                  total: { type: "integer", example: 42 },
                  page: { type: "integer", example: 1 },
                  limit: { type: "integer", example: 20 },
                  totalPages: { type: "integer", example: 3 },
                },
              },
            },
          },
        },
      },
    },
  },
  paths: {
    "/health": {
      get: {
        summary: "Health check",
        responses: {
          "200": {
            description: "Backend is running",
          },
        },
      },
    },
    "/auth/login": {
      post: {
        summary: "Login",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Login successful",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginResponse" },
              },
            },
          },
          "401": {
            description: "Invalid credentials",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiError" },
              },
            },
          },
        },
      },
    },
    "/auth/refresh": {
      post: {
        summary: "Refresh access token",
        description:
          "Uses httpOnly refreshToken cookie. Body refreshToken is optional fallback. Requires CSRF header x-csrf-token matching csrfToken cookie.",
        parameters: [
          {
            name: "x-csrf-token",
            in: "header",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RefreshRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Token refreshed",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RefreshResponse" },
              },
            },
          },
          "401": {
            description: "Invalid/expired refresh token",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiError" },
              },
            },
          },
          "403": { description: "Invalid CSRF token", content: errorContent },
        },
      },
    },
    "/auth/logout": {
      post: {
        summary: "Logout",
        description: "Revokes current refresh token and clears auth cookies. Requires CSRF header x-csrf-token.",
        parameters: [
          {
            name: "x-csrf-token",
            in: "header",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "Logged out",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LogoutResponse" },
              },
            },
          },
          "403": { description: "Invalid CSRF token", content: errorContent },
        },
      },
    },
    "/me": {
      get: {
        summary: "Get current user",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Current authenticated user",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MeResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiError" },
              },
            },
          },
        },
      },
    },
    "/mct-cases": {
      get: {
        summary: "List MCT cases",
        description:
          "Role-aware listing. CORPER: own cases, DOCTOR: assigned cases, COORDINATOR/ABUJA_ADMIN/DG/SYSTEM: all.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "status",
            in: "query",
            required: false,
            schema: {
              type: "string",
              enum: [
                "CREATED",
                "UNDER_REVIEW",
                "REVIEW_REQUIRED",
                "ESCALATED",
                "APPROVED",
                "REJECTED",
                "CLOSED",
              ],
            },
          },
          { name: "page", in: "query", required: false, schema: { type: "integer", minimum: 1, default: 1 } },
          {
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
          },
        ],
        responses: {
          "200": {
            description: "List of MCT cases",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MctCaseListResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiError" },
              },
            },
          },
        },
      },
    },
    "/mct-cases/{id}": {
      get: {
        summary: "Get MCT case by ID",
        description: "Returns one MCT case if requester is allowed by role ownership/assignment rules.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "MCT case",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MctCaseResponse" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiError" },
              },
            },
          },
          "403": {
            description: "Forbidden",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiError" },
              },
            },
          },
          "404": {
            description: "Not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiError" },
              },
            },
          },
        },
      },
    },
    "/mct-cases/{id}/status": {
      patch: {
        summary: "Transition MCT case status",
        description:
          "Transitions case state using role-based rules and writes audit logs for attempt/success/failure.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/TransitionMctCaseStatusRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Status updated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MctCaseResponse" },
              },
            },
          },
          "400": {
            description: "Invalid transition",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiError" },
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiError" },
              },
            },
          },
          "403": {
            description: "Forbidden",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiError" },
              },
            },
          },
          "404": {
            description: "Not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiError" },
              },
            },
          },
        },
      },
    },
    "/mct-cases/{id}/verification-codes": {
      post: {
        summary: "Generate verification code for case",
        description:
          "Generates a verification code for the case. In normal environments, plaintext code is not returned in API response.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "201": {
            description: "Verification code generated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/VerificationCodeResponse" },
              },
            },
          },
          "400": { description: "Bad request", content: errorContent },
          "401": { description: "Unauthorized", content: errorContent },
          "403": { description: "Forbidden", content: errorContent },
          "404": { description: "Case not found", content: errorContent },
        },
      },
    },
    "/verification-codes/validate": {
      post: {
        summary: "Validate verification code (corper only)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ValidateVerificationCodeRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Code validated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/VerificationCodeResponse" },
              },
            },
          },
          "400": { description: "Invalid/expired/used code", content: errorContent },
          "401": { description: "Unauthorized", content: errorContent },
          "403": { description: "Forbidden", content: errorContent },
        },
      },
    },
    "/verification-codes/extend": {
      post: {
        summary: "Extend verification code expiry",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ExtendVerificationCodeRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Code extended",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/VerificationCodeResponse" },
              },
            },
          },
          "400": { description: "Cannot extend", content: errorContent },
          "401": { description: "Unauthorized", content: errorContent },
          "403": { description: "Forbidden", content: errorContent },
          "404": { description: "Code not found", content: errorContent },
        },
      },
    },
    "/decisions/mct-cases/{id}/generate": {
      post: {
        summary: "Generate draft decision for case",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          "201": {
            description: "Draft generated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DecisionResponse" },
              },
            },
          },
          "401": { description: "Unauthorized", content: errorContent },
          "403": { description: "Forbidden", content: errorContent },
          "404": { description: "Case not found", content: errorContent },
        },
      },
    },
    "/decisions/{decisionId}/override": {
      patch: {
        summary: "Override decision",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "decisionId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/OverrideDecisionRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Decision overridden",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DecisionResponse" },
              },
            },
          },
          "401": { description: "Unauthorized", content: errorContent },
          "403": { description: "Forbidden", content: errorContent },
          "404": { description: "Decision not found", content: errorContent },
        },
      },
    },
    "/decisions/{decisionId}/finalize": {
      post: {
        summary: "Finalize decision (DG required for escalated cases)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "decisionId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          "200": { description: "Decision finalized" },
          "401": { description: "Unauthorized", content: errorContent },
          "403": { description: "Forbidden", content: errorContent },
          "404": { description: "Decision not found", content: errorContent },
        },
      },
    },
    "/audit": {
      get: {
        summary: "List audit logs",
        description: "ABUJA_ADMIN and DG access only.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", required: false, schema: { type: "integer", minimum: 1, default: 1 } },
          { name: "limit", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
          { name: "state", in: "query", required: false, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Audit list",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuditListResponse" },
              },
            },
          },
          "400": { description: "Validation error", content: errorContent },
          "401": { description: "Unauthorized", content: errorContent },
          "403": { description: "Forbidden", content: errorContent },
        },
      },
    },
    "/audit/{id}": {
      get: {
        summary: "Get audit log by ID",
        description: "ABUJA_ADMIN and DG access only.",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          { name: "state", in: "query", required: false, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description: "Audit log item",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuditItemResponse" },
              },
            },
          },
          "400": { description: "Validation error", content: errorContent },
          "401": { description: "Unauthorized", content: errorContent },
          "403": { description: "Forbidden", content: errorContent },
          "404": { description: "Not found", content: errorContent },
        },
      },
    },
    "/admin/hospitals": {
      get: {
        summary: "List hospitals (admin)",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Hospital list",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HospitalListResponse" },
              },
            },
          },
          "401": { description: "Unauthorized", content: errorContent },
          "403": { description: "Forbidden", content: errorContent },
        },
      },
      post: {
        summary: "Create hospital (admin)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "state", "tier", "approvedRegistryId"],
                properties: {
                  name: { type: "string" },
                  state: { type: "string" },
                  tier: { type: "string", enum: ["TIER_1", "TIER_2"] },
                  approvedRegistryId: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Hospital created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HospitalResponse" },
              },
            },
          },
          "401": { description: "Unauthorized", content: errorContent },
          "403": { description: "Forbidden", content: errorContent },
        },
      },
    },
    "/admin/hospitals/{id}": {
      patch: {
        summary: "Update hospital (admin)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": {
            description: "Hospital updated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/HospitalResponse" },
              },
            },
          },
          "401": { description: "Unauthorized", content: errorContent },
          "403": { description: "Forbidden", content: errorContent },
          "404": { description: "Not found", content: errorContent },
        },
      },
    },
    "/admin/doctors": {
      get: {
        summary: "List doctors (admin)",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Doctor list",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DoctorListResponse" },
              },
            },
          },
          "401": { description: "Unauthorized", content: errorContent },
          "403": { description: "Forbidden", content: errorContent },
        },
      },
      post: {
        summary: "Create doctor record (admin)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["userId", "hospitalId", "mdcnNumber"],
                properties: {
                  userId: { type: "string", format: "uuid" },
                  hospitalId: { type: "string", format: "uuid" },
                  mdcnNumber: { type: "string" },
                  specialization: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Doctor created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DoctorResponse" },
              },
            },
          },
          "401": { description: "Unauthorized", content: errorContent },
          "403": { description: "Forbidden", content: errorContent },
        },
      },
    },
    "/admin/doctors/{id}": {
      patch: {
        summary: "Update doctor record (admin)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": {
            description: "Doctor updated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DoctorResponse" },
              },
            },
          },
          "401": { description: "Unauthorized", content: errorContent },
          "403": { description: "Forbidden", content: errorContent },
          "404": { description: "Not found", content: errorContent },
        },
      },
    },
  },
} as const;

export function setupSwagger(app: Express): void {
  app.get("/docs.json", (_req, res) => {
    res.status(200).json(openApiSpec);
  });
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));
}
