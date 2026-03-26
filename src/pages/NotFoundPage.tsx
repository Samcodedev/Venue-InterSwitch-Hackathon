import { Link } from "react-router-dom";

export const NotFoundPage = () => (
  <div className="container page-pad">
    <section className="panel state-card state-card-center not-found-card">
      <span className="eyebrow">404</span>
      <h1>That page does not exist in SmartMove.</h1>
      <p>Return to the homepage or jump straight into route discovery.</p>
      <div className="hero-actions">
        <Link to="/" className="ghost-button">
          Back home
        </Link>
        <Link to="/discover" className="solid-button">
          Explore trips
        </Link>
      </div>
    </section>
  </div>
);
