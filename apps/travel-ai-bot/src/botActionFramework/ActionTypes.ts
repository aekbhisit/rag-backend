/**
 * Bot Action Framework
 * Core Action Types and Payloads
 */

/**
 * Enum defining all possible action types
 */
export enum ActionType {
  // Navigation Actions
  NAVIGATE_PAGE = 'navigate_page',
  NAVIGATE_SECTION = 'navigate_section',
  NAVIGATE_BACK = 'navigate_back',
  
  // Selection Actions
  SELECT_ITEM = 'select_item',
  SELECT_OPTION = 'select_option',
  SELECT_TAB = 'select_tab',

  // Content / UI extraction
  EXTRACT_CONTENT = 'extract_content',
  
  // Input Actions
  FILL_INPUT = 'fill_input',
  FILL_FORM = 'fill_form',
  TOGGLE_CONTROL = 'toggle_control',
  SUBMIT_FORM = 'submit_form',
  
  // Interaction Actions
  CLICK_BUTTON = 'click_button',
  EXPAND_COLLAPSE = 'expand_collapse',
  OPEN_MODAL = 'open_modal',
  CLOSE_MODAL = 'close_modal',
  PLAY_MEDIA = 'play_media',
  
  // Contextual Actions
  MAP_ZOOM = 'map_zoom',
  MAP_FOCUS = 'map_focus',
  FILTER_CONTENT = 'filter_content',
  SORT_CONTENT = 'sort_content',
  SWITCH_VIEW = 'switch_view'
}

/**
 * Base interface for all action payloads
 */
export interface ActionPayload {
  actionId: string;  // Unique identifier for the action
}

/**
 * Navigation action payloads
 */
export interface NavigatePagePayload extends ActionPayload {
  pageName: string;
  pageParams?: Record<string, any>;
}

export interface NavigateSectionPayload extends ActionPayload {
  sectionId: string;
  behavior?: 'auto' | 'smooth';
}

export interface NavigateBackPayload extends ActionPayload {
  steps?: number;  // Number of steps to go back, defaults to 1
}

/**
 * Selection action payloads
 */
export interface SelectItemPayload extends ActionPayload {
  itemType: string;
  itemId: string;
  listContext?: string;
}

export interface SelectOptionPayload extends ActionPayload {
  optionId: string;
  optionValue: string | boolean | number;
  controlId: string;
}

export interface SelectTabPayload extends ActionPayload {
  tabId: string;
  tabsetId: string;
}

/**
 * Input action payloads
 */
export interface FillInputPayload extends ActionPayload {
  inputId: string;
  inputValue: string | number | boolean;
}

export interface FillFormPayload extends ActionPayload {
  formId: string;
  formValues: Record<string, any>;
  autoSubmit?: boolean;
}

export interface ToggleControlPayload extends ActionPayload {
  controlId: string;
  newState?: boolean;  // If undefined, toggle the current state
}

export interface SubmitFormPayload extends ActionPayload {
  formId: string;
}

/**
 * Interaction action payloads
 */
export interface ClickButtonPayload extends ActionPayload {
  buttonId: string;
  contextId?: string;  // Optional context for the button
}

export interface ExpandCollapsePayload extends ActionPayload {
  elementId: string;
  expand?: boolean;  // If undefined, toggle the current state
}

export interface OpenModalPayload extends ActionPayload {
  modalType: string;
  initialData?: Record<string, any>;
}

export interface CloseModalPayload extends ActionPayload {
  modalId?: string;  // If undefined, close the current/top modal
}

export interface PlayMediaPayload extends ActionPayload {
  mediaId: string;
  action: 'play' | 'pause' | 'stop' | 'seek';
  position?: number;  // For seek action
}

/**
 * Contextual action payloads
 */
export interface MapZoomPayload extends ActionPayload {
  zoomLevel: number;
  mapId?: string;
}

export interface MapFocusPayload extends ActionPayload {
  latitude: number;
  longitude: number;
  zoomLevel?: number;
  mapId?: string;
}

export interface FilterContentPayload extends ActionPayload {
  filters: Record<string, any>;
  contentType: string;
  replace?: boolean;  // Replace existing filters or add to them
}

export interface SortContentPayload extends ActionPayload {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  contentType: string;
}

export interface SwitchViewPayload extends ActionPayload {
  viewMode: string;  // e.g., 'list', 'grid', 'map'
  contentType: string;
}

/**
 * Union type of all possible payloads
 */
export type ActionPayloadUnion = 
  | NavigatePagePayload
  | NavigateSectionPayload
  | NavigateBackPayload
  | SelectItemPayload
  | SelectOptionPayload
  | SelectTabPayload
  | FillInputPayload
  | FillFormPayload
  | ToggleControlPayload
  | SubmitFormPayload
  | ClickButtonPayload
  | ExpandCollapsePayload
  | OpenModalPayload
  | CloseModalPayload
  | PlayMediaPayload
  | MapZoomPayload
  | MapFocusPayload
  | FilterContentPayload
  | SortContentPayload
  | SwitchViewPayload;

/**
 * Action result interface
 */
export interface ActionResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
} 