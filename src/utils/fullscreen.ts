
/**
 * Toggles the document's fullscreen mode.
 */
export const toggleFullScreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch((err) => {
      console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
    });
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
};

/**
 * Checks if the document is currently in fullscreen mode.
 */
export const isFullScreen = () => {
  return !!document.fullscreenElement;
};
