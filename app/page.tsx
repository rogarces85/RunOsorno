import { IconRun } from "@tabler/icons-react";

export default function Home() {
  return (
    <div className="page">
      <div className="page-wrapper">
        <div className="container-xl py-4">
          <div className="card">
            <div className="card-body">
              <h3 className="card-title d-flex align-items-center gap-2">
                <IconRun size={24} /> RunOsorno
              </h3>
              <p className="text-secondary mb-0">
                Tabler + Next.js funcionando correctamente.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
