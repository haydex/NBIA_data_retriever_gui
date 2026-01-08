# Toast Notification Usage Guide

The toast notification system has been successfully integrated into your TCIA Retriever application. Here's how to use it:

## Basic Usage

In your TypeScript code (`app.component.ts`), call the `showToast()` method:

```typescript
// Show a success message (green)
this.showToast("Download completed successfully!", "success");

// Show an error message (red)
this.showToast("Failed to connect to server", "error");

// Show a warning message (orange)
this.showToast("Connection is slow", "warning");

// Show an info message (blue)
this.showToast("Processing your request...", "info");
```

## Method Signature

```typescript
showToast(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', duration: number = 5000)
```

### Parameters:

- **message** (string): The text to display in the toast
- **type** (optional): The toast type - determines the color:
  - `'success'` - Green background
  - `'error'` - Red background
  - `'warning'` - Orange background
  - `'info'` - Blue background (default)
- **duration** (optional): How long to show the toast in milliseconds (default: 5000ms = 5 seconds)
  - Set to `0` for a persistent toast that stays until manually closed

## Examples

```typescript
// Auto-hide after 3 seconds
this.showToast("File saved successfully", "success", 3000);

// Persistent toast (user must click X to close)
this.showToast("Critical error occurred", "error", 0);

// Default 5-second duration
this.showToast("Download started", "info");

// Custom duration
this.showToast("Please wait...", "warning", 10000);
```

## Features

✅ **Positioned at bottom center** of the screen  
✅ **Animated slide-up** entrance and exit  
✅ **User can close** by clicking the X button  
✅ **Auto-dismisses** after the specified duration (unless duration is 0)  
✅ **Four color themes** (success/green, error/red, warning/orange, info/blue)  
✅ **Responsive** design with max-width  
✅ **Dark mode** compatible with adjusted colors  
✅ **Icon indicators** for each toast type

## Already Integrated

The toast is already being used in the error handling for the "Fetch Files" button. When you click "Fetch Files" without selecting the required paths, you'll see a red error toast at the bottom.

## Manual Close

Users can close the toast at any time by clicking the X button on the right side.
