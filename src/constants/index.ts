/**
 * Authoritative Single Source of Truth (SSOT) for Cogmit application-wide
 * shared constants, brand and design tokens, content/validation limits,
 * operational configuration, storage identifiers, timeouts, routes, and error messages.
 *
 * YVS Guidelines v1.2.2 Compliance:
 * - Brand Colors: YVS Indigo-Violet (#4B0084), YVS Yellow (#FFFF11).
 * - RootCog Title Limit: 197 characters (authoritatively defined, superseding 147 and 77).
 * - Project Name Limit: 57 characters.
 * - Card Description / Excerpt Limit: 597 characters.
 *
 * ABSOLUTE INVARIANT: This module is client- and server-safe (pure values,
 * no node/browser-only runtime dependencies, no secrets).
 */

// ============================================================================
// 1. BRAND & COLOR TOKENS
// ============================================================================

/** Canonical YVS Brand Colors */
export const COLOR_INDIGO_VIOLET = "#4B0084";
export const COLOR_YELLOW = "#FFFF11";

/** Core Base Colors */
export const COLOR_BLACK = "#000000";
export const COLOR_WHITE = "#FFFFFF";

/** UI & Surface Theme Colors */
export const COLOR_DARK_SURFACE = "#09060D";
export const COLOR_LIGHT_SURFACE = "#F8F5FA";
export const COLOR_TEXT_PRIMARY_LIGHT = "#17121C";
export const COLOR_TEXT_MUTED = "#64748B";
export const COLOR_TEXT_MUTED_DARK = "#94A3B8";

/** Component-Specific Accent & Surface Colors */
export const COLOR_DARK_PURPLE_SURFACE = "#1E0038";
export const COLOR_DARK_PURPLE_DROPDOWN = "#2D0052";
export const COLOR_HOVER_INDIGO_VIOLET = "#3A0066";
export const COLOR_HOVER_YELLOW = "#e6e60f";

/** Theme Border & Muted Tokens */
export const COLOR_BORDER_LIGHT = "#E2E8F0";
export const COLOR_MUTED_LIGHT = "#F1F5F9";
export const COLOR_MUTED_DARK = "#1E293B";
export const COLOR_DESTRUCTIVE = "#EF4444";

// ============================================================================
// 2. TYPOGRAPHY TOKENS
// ============================================================================

export interface CardFontOption {
  id: string;
  label: string;
  fontFamily: string;
}

export const CARD_FONT_STACK = "Verdana, Geneva, sans-serif";
export const CARD_FONT_FAMILY = CARD_FONT_STACK;
export const DEFAULT_CARD_FONT = "Arial";

export const CARD_FONTS: CardFontOption[] = [
  { id: "Arial", label: "Arial", fontFamily: "Arial, Helvetica, sans-serif" },
  { id: "Verdana", label: "Verdana", fontFamily: "Verdana, Geneva, sans-serif" },
  { id: "Times New Roman", label: "Times New Roman", fontFamily: "'Times New Roman', Times, serif" },
];

/** SVG Card Font Sizes & Weights */
export const FONT_HEADER_SIZE = 47;
export const FONT_HEADER_WEIGHT = 800;
export const FONT_TITLE_SIZE = 41;
export const FONT_TITLE_WEIGHT = 600;
export const FONT_BODY_SIZE = 37;
export const FONT_BODY_WEIGHT = 400;

export const CARD_TITLE_LINE_HEIGHT = 54;
export const CARD_EXCERPT_LINE_HEIGHT = 48;

// ============================================================================
// 3. DIMENSIONS & SPACING TOKENS
// ============================================================================

/** Intrinsic Card Dimensions */
export const CARD_WIDTH_PORTRAIT = 969;  // 3:4 portrait
export const CARD_HEIGHT_PORTRAIT = 1292;
export const CARD_WIDTH_LANDSCAPE = 969; // 3:2 landscape
export const CARD_HEIGHT_LANDSCAPE = 646;

/** Legacy Dimension Aliases */
export const CARD_WIDTH = CARD_WIDTH_PORTRAIT;
export const CARD_HEIGHT = CARD_HEIGHT_PORTRAIT;

/** Card SVG Internal Insets and Offsets */
export const CARD_PADDING_X = 65;
export const CARD_BORDER_INSET = 26;
export const CARD_BORDER_RADIUS = 20;
export const CARD_HEADER_Y = 91;
export const CARD_HEADER_DIVIDER_Y = 114;
export const CARD_TITLE_START_Y = 190;

/** Global Layout Shell Widths */
export const HEADER_CONTENT_MAX_WIDTH = 1400;
export const PAGE_CONTENT_MAX_WIDTH = 1400;

/** Yappout Playback Buffer & Gestures */
export const YAPPOUT_SCROLL_MARGIN = 80;      // px buffer zone for scroll controller
export const YAPPOUT_DOUBLE_TAP_DELAY = 300;  // ms tolerance for double tap
export const YAPPOUT_TAP_SLOP = 20;          // px movement tolerance for double tap

// ============================================================================
// 4. CONTENT & VALIDATION LIMITS
// ============================================================================

/**
 * Authoritative RootCog title maximum length across Cogmit (197 characters).
 * Officially supersedes earlier 147 and 77 character limits.
 */
export const MAX_ROOTCOG_TITLE_LENGTH = 197;
export const CARD_TITLE_MAX = MAX_ROOTCOG_TITLE_LENGTH;

/** Authoritative Cogmit Card excerpt/description maximum length (597 characters). */
export const CARD_DESCRIPTION_MAX = 597;
export const MAX_EXCERPT_LENGTH = CARD_DESCRIPTION_MAX;

/** Project name character limit (57 characters). */
export const MAX_PROJECT_NAME_LENGTH = 57;

/** Navigation user display name truncation threshold. */
export const MAX_NAV_DISPLAY_NAME_LENGTH = 11;

// ============================================================================
// 5. APPLICATION DEFAULTS & OPERATIONAL CONFIGURATION
// ============================================================================

/** Card Renderer Template Version */
export const TEMPLATE_VERSION = "1.8.0";

/** Default Production Domain */
export const DEFAULT_PRODUCTION_DOMAIN = "cogmit.com";

/** Yappout Speech Playback Speeds */
export const SPEED_CYCLE = [1, 1.5, 2, 0.5, 0.75] as const;
export const SPEED_LABELS = ['1×', '1.5×', '2×', '0.5×', '0.75×'] as const;
export const DEFAULT_SPEED_IDX = 0; // index 0 = 1x

/** GitHub API Retries & Pagination */
export const DEFAULT_RETRY_COUNT = 2;
export const DEFAULT_RETRY_DELAY_MS = 500;
export const RETRYABLE_HTTP_STATUSES = [502, 503, 504] as const;
export const DEFAULT_COMMITS_PER_PAGE = 100;

/** Revalidation Intervals (seconds) */
export const REVALIDATE_INTERVAL_SITEMAP = 3600;
export const REVALIDATE_INTERVAL_RAW_CONTENT = 60;

/** NextAuth GitHub Scope */
export const AUTH_GITHUB_SCOPE = "read:user user:email repo";

// ============================================================================
// 6. TIMEOUTS & DELAYS (MILLISECONDS)
// ============================================================================

export const FEEDBACK_TIMEOUT_COPIED_FAST_MS = 1500; // Fast feedback (e.g. Publish modal copy)
export const FEEDBACK_TIMEOUT_COPIED_MS = 2000;      // Standard feedback (e.g. Share modal copy)
export const FEEDBACK_TIMEOUT_ERROR_MS = 3000;       // Error feedback (e.g. Share modal copy error)
export const AUTH_FAILURE_RESET_DELAY_MS = 2000;     // Auth failure handler reset delay
export const TOOLBAR_COLLAPSE_TIMEOUT_MS = 3000;     // Responsive action toolbar collapse
export const BLOB_REVOKE_DELAY_MS = 1000;            // Revoke temporary image blob URL

// ============================================================================
// 7. STORAGE IDENTIFIERS & FILE NAMES
// ============================================================================

/** Canonical Cogmit GitHub Repository Names */
export const COGMIT_REPO_PUBLIC = "YVSApps_Data_Cogmit_Public";
export const COGMIT_REPO_PRIVATE = "YVSApps_Data_Cogmit_Private";
export const COGMIT_REPO_PUBLISHED = "YVSApps_Data_Cogmit_Public";

/** Core Storage Directory Names */
export const DIR_PROJECTS = "projects";
export const DIR_NPP_COGS = "NPPCogs";
export const DIR_DELETED_COGS = "deletedCogs";
export const DIR_COGMITS = "cogmits";

/** Canonical Storage File Names */
export const FILE_COGS_INDEX = "cogsIndex.json";
export const FILE_ROOT_COG_MD = "rootCog.md";
export const FILE_ROOT_COG_INFO = "rootCogInfo.json";
export const FILE_CHILDREN_JSON = "children.json";
export const FILE_PROJECT_DATA = "projectData.json";
export const FILE_COGMITS_INDEX = "cogmitsIndex.json";
export const PATH_COGMITS_INDEX = "cogmits/cogmitsIndex.json";
export const FILE_GITKEEP = ".gitkeep";

/** Project Sentinel Constants */
export const NO_PARENT_PROJECT = "No Parent Project";
export const PROJECT_ROOT_PARENT = "ROOT";

/** Session Cookie Names */
export const COOKIE_SESSION_TOKEN_SECURE = "__Secure-authjs.session-token";
export const COOKIE_SESSION_TOKEN_STANDARD = "authjs.session-token";

// ============================================================================
// 8. ROUTE CONSTANTS
// ============================================================================

export const ROUTE_HOME = "/";
export const ROUTE_LOGIN = "/login";
export const ROUTE_CONNECT = "/connect";
export const ROUTE_ABOUT = "/aboutCogmit";
export const ROUTE_MY_COGS = "/myCogs";
export const ROUTE_NEW_COG = "/myCogs/new/editCog";
export const ROUTE_DELETED_COGS = "/myCogs/deletedCogs";
export const ROUTE_COGMITS_PREFIX = "/cogmits";

// ============================================================================
// 9. ERROR & VALIDATION MESSAGES
// ============================================================================

export const ERROR_TITLE_REQUIRED = "Title is required";
export const ERROR_TITLE_TOO_LONG = `Title must be ${MAX_ROOTCOG_TITLE_LENGTH} characters or fewer`;
export const ERROR_PROJECT_NAME_REQUIRED = "Project name is required";
export const ERROR_PROJECT_NAME_TOO_LONG = `Project name must be ${MAX_PROJECT_NAME_LENGTH} characters or less`;
export const ERROR_PROJECT_ALREADY_EXISTS = "Project already exists";
export const ERROR_SUBPROJECT_NAME_EMPTY = "Subproject name cannot be empty.";
export const ERROR_SELECT_DESTINATION_PROJECT = "Please select a destination project.";
export const ERROR_REPO_NOT_READY = "Cogmit repository is not ready";
export const ERROR_UNAUTHORIZED = "Unauthorized";
export const ERROR_COGS_INDEX_NOT_FOUND = "cogsIndex.json could not be read.";
export const ERROR_COGS_INDEX_MISSING_INVALID = "cogsIndex.json missing or invalid";
export const ERROR_ROOTCOG_NOT_FOUND = "RootCog not found in index";
export const ERROR_COG_ALREADY_DELETED = "Cog is already deleted";
export const ERROR_CURRENT_PATH_NOT_DIR = "Current RootCog path is not a directory";
export const ERROR_TARGET_DELETED_PATH_EXISTS = "Target deleted path already exists";
export const ERROR_FAILED_MOVE_PROJECT = "Failed to move project.";
