function getScrollBarWidth() {
  // Create a container
  const outer = document.createElement('div');
  outer.style.position = 'absolute';
  outer.style.top = '-9999px'; // Offscreen for safety
  outer.style.left = '-9999px';
  outer.style.width = '100px'; // Fixed width
  outer.style.height = '100px'; // Fixed height
  outer.style.overflow = 'hidden'; // Start without scrollbar
  outer.style.visibility = 'hidden'; // Invisible

  // Add some content taller than the container
  const inner = document.createElement('div');
  inner.style.height = '200px'; // Forces vertical overflow
  outer.appendChild(inner);

  // Append to DOM
  document.body.appendChild(outer);

  // Measure width without scrollbar
  const widthNoScroll = outer.clientWidth;

  // Force scrollbar
  outer.style.overflow = 'scroll';
  const widthWithScroll = outer.clientWidth;

  // Clean up
  document.body.removeChild(outer);

  // Difference is scrollbar width
  return widthNoScroll - widthWithScroll;
}