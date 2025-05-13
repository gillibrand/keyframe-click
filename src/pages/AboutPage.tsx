export default function AboutPage() {
  return (
    <main>
      <div className="wrapper-small">
        <div className="tile">
          <h2>About Keyframe Click</h2>
          <p>
            Keyframe Click is a visual way to create CSS animation keyframes. Add CSS properties to different layers.
            Create a curve to change the values over time. Add extra keyframes for smoother curves.
          </p>
          <p>
            It's fun now, but a work-in-progress, so check back soon.{" "}
            <a href="https://github.com/gillibrand/keyframe-click">Find it on GitHub</a>.
          </p>
          <p>
            This started from a much simpler <a href="https://github.com/gillibrand/keyframe-gen">Keyframe Generator</a>{" "}
            that ran against a bitmap image.
          </p>

          <p>
            Created by <a href="https://www.linkedin.com/in/jay-gillibrand/">Jay Gillibrand</a>. See more of my work on{" "}
            <a href="https://gillibrand.github.io/projects/">my project site</a>.
          </p>
        </div>
      </div>
    </main>
  );
}
