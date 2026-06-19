import { createRoot } from 'react-dom/client';
import BlueprintArchitectureCanvas from './components/BlueprintArchitectureCanvas';

// @ts-ignore - dev-only JSON imports
import ecommerce from '../LATEST-ARTIFACTS/blueprint-multi-region-e-commerce-platform-20260526-2149-gpt51-low.json';
// @ts-ignore
import rag from '../LATEST-ARTIFACTS/blueprint-enterprise-rag-application-azure-20260526-1624-gpt51-low.json';
// @ts-ignore
import microservices from '../Blueprint-diagram-generation/blueprint-microservices-platform-azure-container-20260528-1617-gpt54-low.json';
// @ts-ignore
import iot from '../LATEST-ARTIFACTS/blueprint-industrial-iot-predictive-maintenance-20260526-2126-gpt51-low.json';

const cases = [
  { id: 'ecommerce', title: 'Multi-region e-commerce (8 nodes / 9 edges / 4 zones)', data: ecommerce },
  { id: 'rag', title: 'Enterprise RAG (11 nodes / 10 edges / 7 zones)', data: rag },
  { id: 'microservices', title: 'Microservices on Container Apps (9 nodes / 9 edges / 5 zones)', data: microservices },
  { id: 'iot', title: 'Industrial IoT predictive maintenance (12 nodes / 12 edges / 5 zones)', data: iot },
];

function App() {
  return (
    <>
      {cases.map((c) => (
        <div className="case" id={`case-${c.id}`} key={c.id}>
          <h2>{c.title}</h2>
          <BlueprintArchitectureCanvas data={c.data as any} author="Preview" legendPosition="auto" />
        </div>
      ))}
    </>
  );
}

createRoot(document.getElementById('bp-preview-root')!).render(<App />);
