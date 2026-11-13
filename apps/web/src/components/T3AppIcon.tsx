// The app icon the web app already ships and serves, whatever this build's channel.
export function T3AppIcon(props: { readonly className?: string }) {
  return <img src="/apple-touch-icon.png" alt="" className={props.className} />;
}
