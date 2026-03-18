#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import {
  gpca_login,
  gpca_verify_login,
  gpca_auth_status,
  gpca_get_user_info,
  gpca_get_captcha,
  gpca_register,
  gpca_finish_register,
  gpca_send_reset_password_email,
  gpca_reset_password,
  gpca_invite_link,
} from "./tools/auth.js";
import {
  gpca_list_cards,
  gpca_supported_cards,
  gpca_order_virtual_card,
  gpca_bind_card,
  gpca_activate_card,
  gpca_freeze_card,
  gpca_change_pin,
  gpca_reset_pin,
  gpca_get_cvv,
  gpca_card_transactions,
} from "./tools/cards.js";
import {
  gpca_wallet_balance,
  gpca_supported_chains,
  gpca_deposit_address,
  gpca_bank_card_list,
  gpca_deposit_to_card,
  gpca_wallet_transactions,
} from "./tools/wallet.js";
import {
  gpca_check_kyc,
  gpca_get_countries,
  gpca_request_kyc,
  gpca_request_kyc_visa,
  gpca_submit_kyc,
  gpca_add_kyc_file,
  gpca_reset_kyc,
  gpca_chinese_to_pinyin,
} from "./tools/kyc.js";
import {
  gpca_notification_list,
  gpca_notification_detail,
} from "./tools/notification.js";
import {
  gpca_view_all_tickets,
  gpca_get_ticket_detail,
  gpca_create_ticket,
  gpca_reply_ticket,
  gpca_close_ticket,
} from "./tools/ticket.js";
import {
  gpca_set_spending_limit,
  gpca_get_spending_limits,
  gpca_spending_summary,
  gpca_remove_spending_limit,
  gpca_record_spending,
} from "./tools/spending-limit.js";

const server = new Server(
  {
    name: "gpca-card-manager",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ── Tool Definitions ──

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    // Auth tools
    {
      name: "gpca_login",
      description:
        "Initiate GPCA login. Sends a verification code to the user's email. Must be followed by gpca_verify_login.",
      inputSchema: {
        type: "object" as const,
        properties: {
          email: { type: "string", description: "User's email address" },
          password: { type: "string", description: "User's password" },
        },
        required: ["email", "password"],
      },
    },
    {
      name: "gpca_verify_login",
      description:
        "Complete login with the email verification code. Must call gpca_login first.",
      inputSchema: {
        type: "object" as const,
        properties: {
          code: {
            type: "string",
            description: "6-digit verification code from email",
          },
        },
        required: ["code"],
      },
    },
    {
      name: "gpca_auth_status",
      description: "Check if the user is currently authenticated.",
      inputSchema: { type: "object" as const, properties: {} },
    },
    {
      name: "gpca_get_user_info",
      description: "Get the current user's profile information.",
      inputSchema: { type: "object" as const, properties: {} },
    },
    {
      name: "gpca_get_captcha",
      description:
        "Get a captcha image for registration. Returns base64-encoded PNG image.",
      inputSchema: { type: "object" as const, properties: {} },
    },
    {
      name: "gpca_register",
      description:
        "Register a new GPCA account. Requires captcha code from gpca_get_captcha. Sends email verification code after successful submission.",
      inputSchema: {
        type: "object" as const,
        properties: {
          email: { type: "string", description: "Email address" },
          username: { type: "string", description: "Display username" },
          password: { type: "string", description: "Password" },
          r_password: { type: "string", description: "Confirm password (must match password)" },
          validate_code: { type: "string", description: "Captcha code from gpca_get_captcha" },
          recommender_code: { type: "string", description: "Referral/recommendation code (optional)" },
        },
        required: ["email", "username", "password", "r_password", "validate_code"],
      },
    },
    {
      name: "gpca_finish_register",
      description:
        "Complete registration with the email verification code. Must call gpca_register first.",
      inputSchema: {
        type: "object" as const,
        properties: {
          register_id: { type: "string", description: "Registration ID returned by gpca_register" },
          verify_code: { type: "string", description: "6-digit verification code from email" },
        },
        required: ["register_id", "verify_code"],
      },
    },
    {
      name: "gpca_send_reset_password_email",
      description:
        "Send a password reset verification code to the user's email.",
      inputSchema: {
        type: "object" as const,
        properties: {
          email: { type: "string", description: "Email address of the account" },
        },
        required: ["email"],
      },
    },
    {
      name: "gpca_reset_password",
      description:
        "Reset password using the verification code sent via gpca_send_reset_password_email.",
      inputSchema: {
        type: "object" as const,
        properties: {
          email: { type: "string", description: "Email address" },
          code: { type: "string", description: "Verification code from email" },
          new_password: { type: "string", description: "New password" },
        },
        required: ["email", "code", "new_password"],
      },
    },

    {
      name: "gpca_invite_link",
      description:
        "Get the user's invitation code and shareable invite link for referring new users.",
      inputSchema: { type: "object" as const, properties: {} },
    },

    // Card tools
    {
      name: "gpca_list_cards",
      description:
        "List all bank cards owned by the user (Mastercard/Visa, virtual/physical).",
      inputSchema: { type: "object" as const, properties: {} },
    },
    {
      name: "gpca_supported_cards",
      description:
        "List available card types that the user can apply for.",
      inputSchema: { type: "object" as const, properties: {} },
    },
    {
      name: "gpca_order_virtual_card",
      description:
        "Apply for a new virtual bank card. Requires completed KYC.",
      inputSchema: {
        type: "object" as const,
        properties: {
          card_type_id: {
            type: "string",
            description:
              "Card type ID from gpca_supported_cards",
          },
        },
        required: ["card_type_id"],
      },
    },
    {
      name: "gpca_bind_card",
      description: "Bind/link a bank card to the user's account.",
      inputSchema: {
        type: "object" as const,
        properties: {
          card_id: { type: "string", description: "Card ID to bind" },
        },
        required: ["card_id"],
      },
    },
    {
      name: "gpca_activate_card",
      description: "Activate a bank card.",
      inputSchema: {
        type: "object" as const,
        properties: {
          card_id: { type: "string", description: "Card ID to activate" },
        },
        required: ["card_id"],
      },
    },
    {
      name: "gpca_freeze_card",
      description: "Freeze or unfreeze a bank card.",
      inputSchema: {
        type: "object" as const,
        properties: {
          card_id: {
            type: "string",
            description: "Card ID to freeze/unfreeze",
          },
        },
        required: ["card_id"],
      },
    },
    {
      name: "gpca_change_pin",
      description: "Change the PIN of a bank card.",
      inputSchema: {
        type: "object" as const,
        properties: {
          card_id: { type: "string", description: "Card ID" },
          old_pin: { type: "string", description: "Current PIN" },
          new_pin: { type: "string", description: "New PIN" },
        },
        required: ["card_id", "old_pin", "new_pin"],
      },
    },
    {
      name: "gpca_reset_pin",
      description: "Reset the PIN of a bank card via verification.",
      inputSchema: {
        type: "object" as const,
        properties: {
          card_id: { type: "string", description: "Card ID" },
        },
        required: ["card_id"],
      },
    },
    {
      name: "gpca_get_cvv",
      description:
        "Retrieve the CVV of a virtual card. WARNING: Sensitive information.",
      inputSchema: {
        type: "object" as const,
        properties: {
          card_id: { type: "string", description: "Card ID" },
        },
        required: ["card_id"],
      },
    },
    {
      name: "gpca_card_transactions",
      description: "Get transaction history for a specific bank card.",
      inputSchema: {
        type: "object" as const,
        properties: {
          card_id: { type: "string", description: "Card ID" },
          start_time: {
            type: "string",
            description: "Start date (YYYY-MM-DD), optional",
          },
          end_time: {
            type: "string",
            description: "End date (YYYY-MM-DD), optional",
          },
        },
        required: ["card_id"],
      },
    },

    // Wallet tools
    {
      name: "gpca_wallet_balance",
      description: "Get the user's USDT wallet balance.",
      inputSchema: { type: "object" as const, properties: {} },
    },
    {
      name: "gpca_supported_chains",
      description:
        "List supported blockchain networks for USDT deposits.",
      inputSchema: { type: "object" as const, properties: {} },
    },
    {
      name: "gpca_deposit_address",
      description:
        "Get the wallet deposit address for receiving USDT on a specific blockchain. Call gpca_supported_chains first to get available chain names.",
      inputSchema: {
        type: "object" as const,
        properties: {
          chain: {
            type: "string",
            description:
              "Blockchain network name from gpca_supported_chains (e.g. 'TRON', 'BSC')",
          },
        },
        required: ["chain"],
      },
    },
    {
      name: "gpca_bank_card_list",
      description:
        "List bank cards available for USDT-to-USD deposit.",
      inputSchema: { type: "object" as const, properties: {} },
    },
    {
      name: "gpca_deposit_to_card",
      description:
        "Transfer USDT from wallet to a bank card (converts USDT to USD). This is a financial operation — confirm with user before executing.",
      inputSchema: {
        type: "object" as const,
        properties: {
          card_id: {
            type: "string",
            description: "Target bank card ID",
          },
          amount: {
            type: "number",
            description: "Amount of USDT to transfer",
          },
        },
        required: ["card_id", "amount"],
      },
    },
    {
      name: "gpca_wallet_transactions",
      description: "Get USDT wallet transaction history.",
      inputSchema: {
        type: "object" as const,
        properties: {
          start_time: {
            type: "string",
            description: "Start date (YYYY-MM-DD), required",
          },
          end_time: {
            type: "string",
            description: "End date (YYYY-MM-DD), optional. Defaults to today.",
          },
        },
        required: ["start_time"],
      },
    },

    // KYC tools
    {
      name: "gpca_check_kyc",
      description: "Check the user's KYC verification status.",
      inputSchema: { type: "object" as const, properties: {} },
    },
    {
      name: "gpca_get_countries",
      description:
        "Get the list of available countries/nationalities for KYC. Returns name, iso2, iso3, tel for each country.",
      inputSchema: { type: "object" as const, properties: {} },
    },
    {
      name: "gpca_request_kyc",
      description:
        "KYC Step 1 for Mastercard (type=1): Update user personal information. Calls /user/update_user_information. Chinese text is auto-converted to Pinyin. For Visa/Virtual Card, use gpca_request_kyc_visa instead.",
      inputSchema: {
        type: "object" as const,
        properties: {
          kyc_data: {
            type: "object",
            description:
              "Personal info: { firstName, lastName, gender (0=male,1=female), dob (YYYY-MM-DD), nationality (country name), adrLine1, adrLine2?, city, state, country (iso3 e.g. CHN), zipCode, phoneNum, callingCode (e.g. 86), countryCallingCode (iso2 e.g. CN), occupation (default '11'), placeOfBirth (iso3), midName?, employeeID? }. Chinese text auto-converted to Pinyin.",
          },
        },
        required: ["kyc_data"],
      },
    },
    {
      name: "gpca_request_kyc_visa",
      description:
        "KYC for Visa (type=2) or Virtual Card (type=3): Submit all personal info + ID document in one call. Calls /user/request_kyc2. Chinese text is auto-converted to Pinyin. Virtual Card (type=3) does NOT need address proof step.",
      inputSchema: {
        type: "object" as const,
        properties: {
          kyc_data: {
            type: "object",
            description:
              "Combined data: { firstName, lastName, gender (0/1), dob (YYYY-MM-DD), nationality, adrLine1, adrLine2?, city, state, country (iso3), zipCode, phoneNum, callingCode, countryCallingCode (iso2), placeOfBirth (iso3), occupation ('11'), api_type (2=Visa, 3=Virtual), doc_type (1=passport, 4=national_id), code (ID number), issue (YYYY-MM-DD), expire (YYYY-MM-DD), obverse (base64 front photo), handhold (base64 selfie holding ID), reverse? (base64 back, required if doc_type=4), midName?, employeeID?, reason? }",
          },
        },
        required: ["kyc_data"],
      },
    },
    {
      name: "gpca_submit_kyc",
      description:
        "Submit KYC for final review (Mastercard only). Call after gpca_request_kyc + gpca_add_kyc_file (ID) + gpca_add_kyc_file (address) are all done.",
      inputSchema: {
        type: "object" as const,
        properties: {
          kyc_data: {
            type: "object",
            description: "{ api_type: 1 }",
          },
        },
        required: ["kyc_data"],
      },
    },
    {
      name: "gpca_add_kyc_file",
      description:
        "Upload KYC document (Mastercard flow). For ID: { api_type:1, docType:1(passport)|4(national_id), language:'ENG', number, issueBy, issureDate:'YYYY-MM-DD', expireDate:'YYYY-MM-DD', file_base64 }. For address proof: { api_type:1, docType:5(credit_card_statement)|6(utility_bill)|7(bank_statement)|8(bank_letter), language:'ENG', number, issueBy, issureDate:'YYYY-MM-DD', file_base64 }. Chinese text auto-converted to Pinyin.",
      inputSchema: {
        type: "object" as const,
        properties: {
          kyc_data: {
            type: "object",
            description:
              "Document data object (see tool description for field details per document type)",
          },
        },
        required: ["kyc_data"],
      },
    },
    {
      name: "gpca_chinese_to_pinyin",
      description:
        "Convert Chinese text to Pinyin (romanization). Useful for previewing how Chinese names/addresses will be converted before KYC submission. Handles polyphonic characters correctly (e.g. 重庆→Chongqing, 弹子石→Danzishi).",
      inputSchema: {
        type: "object" as const,
        properties: {
          text: {
            type: "string",
            description: "Chinese text to convert",
          },
          type: {
            type: "string",
            description: '"name" for person names, "address" for addresses. Defaults to "address".',
            enum: ["name", "address"],
          },
        },
        required: ["text"],
      },
    },
    {
      name: "gpca_reset_kyc",
      description:
        "Reset KYC data to start the verification process over.",
      inputSchema: { type: "object" as const, properties: {} },
    },

    // Notification tools
    {
      name: "gpca_notification_list",
      description:
        "Get the list of system notifications/announcements.",
      inputSchema: {
        type: "object" as const,
        properties: {
          page: {
            type: "number",
            description: "Page number (optional, defaults to 1)",
          },
        },
      },
    },
    {
      name: "gpca_notification_detail",
      description: "Get the detail of a specific notification/announcement.",
      inputSchema: {
        type: "object" as const,
        properties: {
          id: {
            type: "string",
            description: "Notification ID",
          },
        },
        required: ["id"],
      },
    },

    // Ticket/Message tools
    {
      name: "gpca_view_all_tickets",
      description:
        "List all support tickets/messages created by the user.",
      inputSchema: { type: "object" as const, properties: {} },
    },
    {
      name: "gpca_get_ticket_detail",
      description: "Get the detail and replies of a specific support ticket.",
      inputSchema: {
        type: "object" as const,
        properties: {
          ticket_id: {
            type: "string",
            description: "Ticket ID",
          },
        },
        required: ["ticket_id"],
      },
    },
    {
      name: "gpca_create_ticket",
      description:
        "Create a new support ticket/message to contact GPCA support.",
      inputSchema: {
        type: "object" as const,
        properties: {
          title: {
            type: "string",
            description: "Ticket title/subject",
          },
          content: {
            type: "string",
            description: "Ticket content/message body",
          },
        },
        required: ["title", "content"],
      },
    },
    {
      name: "gpca_reply_ticket",
      description: "Reply to an existing support ticket.",
      inputSchema: {
        type: "object" as const,
        properties: {
          ticket_id: {
            type: "string",
            description: "Ticket ID to reply to",
          },
          content: {
            type: "string",
            description: "Reply content",
          },
        },
        required: ["ticket_id", "content"],
      },
    },
    {
      name: "gpca_close_ticket",
      description: "Close a support ticket.",
      inputSchema: {
        type: "object" as const,
        properties: {
          ticket_id: {
            type: "string",
            description: "Ticket ID to close",
          },
        },
        required: ["ticket_id"],
      },
    },

    // Spending Limit tools
    {
      name: "gpca_set_spending_limit",
      description:
        "Set or update spending limits for shopping. Limits are enforced before purchases. At least one limit type must be provided.",
      inputSchema: {
        type: "object" as const,
        properties: {
          per_transaction: {
            type: "number",
            description: "Maximum amount per single transaction (USD)",
          },
          daily: {
            type: "number",
            description: "Maximum total spending per day (USD)",
          },
          monthly: {
            type: "number",
            description: "Maximum total spending per month (USD)",
          },
        },
      },
    },
    {
      name: "gpca_get_spending_limits",
      description:
        "Get current spending limit configuration, today's/month's spending totals, and remaining allowances.",
      inputSchema: { type: "object" as const, properties: {} },
    },
    {
      name: "gpca_spending_summary",
      description:
        "Get spending records and totals for a given period.",
      inputSchema: {
        type: "object" as const,
        properties: {
          period: {
            type: "string",
            description:
              'Time period: "today", "month", or "all". Defaults to "today".',
            enum: ["today", "month", "all"],
          },
        },
      },
    },
    {
      name: "gpca_remove_spending_limit",
      description:
        "Remove a specific spending limit type, or all limits.",
      inputSchema: {
        type: "object" as const,
        properties: {
          type: {
            type: "string",
            description:
              'Limit type to remove: "per_transaction", "daily", "monthly", or "all".',
            enum: ["per_transaction", "daily", "monthly", "all"],
          },
        },
        required: ["type"],
      },
    },
    {
      name: "gpca_record_spending",
      description:
        "Record a completed shopping transaction. Called after a successful purchase to track spending against limits.",
      inputSchema: {
        type: "object" as const,
        properties: {
          amount: {
            type: "number",
            description: "Transaction amount in USD",
          },
          description: {
            type: "string",
            description: "Transaction description (product name or order summary)",
          },
        },
        required: ["amount", "description"],
      },
    },
  ],
}));

// ── Tool Call Handler ──

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: any;

    switch (name) {
      // Auth
      case "gpca_login":
        result = await gpca_login(args!.email as string, args!.password as string);
        break;
      case "gpca_verify_login":
        result = await gpca_verify_login(args!.code as string);
        break;
      case "gpca_auth_status":
        result = await gpca_auth_status();
        break;
      case "gpca_get_user_info":
        result = await gpca_get_user_info();
        break;
      case "gpca_get_captcha": {
        const captchaResult = await gpca_get_captcha();
        if (captchaResult.success && captchaResult.data) {
          return {
            content: [
              {
                type: "image" as const,
                data: captchaResult.data.image_base64,
                mimeType: captchaResult.data.mime_type,
              },
              {
                type: "text" as const,
                text: JSON.stringify({
                  success: true,
                  message: captchaResult.message,
                  captcha_hint: "This is a captcha image containing 4-6 alphanumeric characters. If you can read the image, extract the characters and use them as validate_code in gpca_register. If you cannot process images, ask the user to read and type the characters they see.",
                }),
              },
            ],
          };
        }
        result = captchaResult;
        break;
      }
      case "gpca_register":
        result = await gpca_register(
          args!.email as string,
          args!.username as string,
          args!.password as string,
          args!.r_password as string,
          args!.validate_code as string,
          args?.recommender_code as string | undefined
        );
        break;
      case "gpca_finish_register":
        result = await gpca_finish_register(
          args!.register_id as string,
          args!.verify_code as string
        );
        break;
      case "gpca_send_reset_password_email":
        result = await gpca_send_reset_password_email(args!.email as string);
        break;
      case "gpca_reset_password":
        result = await gpca_reset_password(
          args!.email as string,
          args!.code as string,
          args!.new_password as string
        );
        break;
      case "gpca_invite_link":
        result = await gpca_invite_link();
        break;

      // Cards
      case "gpca_list_cards":
        result = await gpca_list_cards();
        break;
      case "gpca_supported_cards":
        result = await gpca_supported_cards();
        break;
      case "gpca_order_virtual_card":
        result = await gpca_order_virtual_card(args!.card_type_id as string);
        break;
      case "gpca_bind_card":
        result = await gpca_bind_card(args!.card_id as string);
        break;
      case "gpca_activate_card":
        result = await gpca_activate_card(args!.card_id as string);
        break;
      case "gpca_freeze_card":
        result = await gpca_freeze_card(args!.card_id as string);
        break;
      case "gpca_change_pin":
        result = await gpca_change_pin(
          args!.card_id as string,
          args!.old_pin as string,
          args!.new_pin as string
        );
        break;
      case "gpca_reset_pin":
        result = await gpca_reset_pin(args!.card_id as string);
        break;
      case "gpca_get_cvv":
        result = await gpca_get_cvv(args!.card_id as string);
        break;
      case "gpca_card_transactions":
        result = await gpca_card_transactions(
          args!.card_id as string,
          args?.start_time as string | undefined,
          args?.end_time as string | undefined
        );
        break;

      // Wallet
      case "gpca_wallet_balance":
        result = await gpca_wallet_balance();
        break;
      case "gpca_supported_chains":
        result = await gpca_supported_chains();
        break;
      case "gpca_deposit_address":
        result = await gpca_deposit_address(args!.chain as string);
        break;
      case "gpca_bank_card_list":
        result = await gpca_bank_card_list();
        break;
      case "gpca_deposit_to_card":
        result = await gpca_deposit_to_card(
          args!.card_id as string,
          args!.amount as number
        );
        break;
      case "gpca_wallet_transactions":
        result = await gpca_wallet_transactions(
          args!.start_time as string,
          args?.end_time as string | undefined
        );
        break;

      // KYC
      case "gpca_check_kyc":
        result = await gpca_check_kyc();
        break;
      case "gpca_get_countries":
        result = await gpca_get_countries();
        break;
      case "gpca_request_kyc":
        result = await gpca_request_kyc(args!.kyc_data as Record<string, any>);
        break;
      case "gpca_request_kyc_visa":
        result = await gpca_request_kyc_visa(args!.kyc_data as Record<string, any>);
        break;
      case "gpca_submit_kyc":
        result = await gpca_submit_kyc(args!.kyc_data as Record<string, any>);
        break;
      case "gpca_add_kyc_file":
        result = await gpca_add_kyc_file(args!.kyc_data as Record<string, any>);
        break;
      case "gpca_chinese_to_pinyin":
        result = await gpca_chinese_to_pinyin(
          args!.text as string,
          args?.type as string | undefined
        );
        break;
      case "gpca_reset_kyc":
        result = await gpca_reset_kyc();
        break;

      // Notifications
      case "gpca_notification_list":
        result = await gpca_notification_list(args?.page as number | undefined);
        break;
      case "gpca_notification_detail":
        result = await gpca_notification_detail(args!.id as string);
        break;

      // Tickets
      case "gpca_view_all_tickets":
        result = await gpca_view_all_tickets();
        break;
      case "gpca_get_ticket_detail":
        result = await gpca_get_ticket_detail(args!.ticket_id as string);
        break;
      case "gpca_create_ticket":
        result = await gpca_create_ticket(
          args!.title as string,
          args!.content as string
        );
        break;
      case "gpca_reply_ticket":
        result = await gpca_reply_ticket(
          args!.ticket_id as string,
          args!.content as string
        );
        break;
      case "gpca_close_ticket":
        result = await gpca_close_ticket(args!.ticket_id as string);
        break;

      // Spending Limits
      case "gpca_set_spending_limit":
        result = await gpca_set_spending_limit(
          args?.per_transaction as number | undefined,
          args?.daily as number | undefined,
          args?.monthly as number | undefined
        );
        break;
      case "gpca_get_spending_limits":
        result = await gpca_get_spending_limits();
        break;
      case "gpca_spending_summary":
        result = await gpca_spending_summary(args?.period as string | undefined);
        break;
      case "gpca_remove_spending_limit":
        result = await gpca_remove_spending_limit(args!.type as string);
        break;
      case "gpca_record_spending":
        result = await gpca_record_spending(
          args!.amount as number,
          args!.description as string
        );
        break;

      default:
        return {
          content: [
            { type: "text", text: `Unknown tool: ${name}` },
          ],
          isError: true,
        };
    }

    return {
      content: [
        { type: "text", text: JSON.stringify(result, null, 2) },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ success: false, message: error.message }),
        },
      ],
      isError: true,
    };
  }
});

// ── Start Server ──

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("GPCA MCP Server running on stdio");
}

main().catch(console.error);
