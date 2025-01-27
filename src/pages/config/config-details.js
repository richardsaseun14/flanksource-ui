import { useEffect, useState, useMemo, useCallback } from "react";
import toast from "react-hot-toast";
import {
  useNavigate,
  useParams,
  useSearchParams,
  useOutletContext
} from "react-router-dom";
import { toastError } from "../../components/Toast/toast";
import { Modal } from "../../components/Modal";
import { IncidentCreate } from "../../components/Incidents/IncidentCreate";
import { getConfig } from "../../api/services/configs";
import { Loading } from "../../components/Loading";
import { JSONViewer } from "../../components/JSONViewer";
import { BreadcrumbNav } from "../../components/BreadcrumbNav";
import { Button } from "../../components/Button";

export function ConfigDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [checked, setChecked] = useState({});
  const [configDetails, setConfigDetails] = useState();
  const { setTitle, setTabRight } = useOutletContext();

  useEffect(() => {
    getConfig(id)
      .then((res) => {
        const data = res?.data[0];
        setConfigDetails(data);
        setTitle(
          <BreadcrumbNav
            list={[
              { to: "/config", title: "Config" },
              <b key="title">{data?.name}</b>
            ]}
          />
        );
      })
      .catch((err) => toastError(err))
      .finally(() => {
        setIsLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!configDetails?.config) {
      return;
    }

    const selected = params.getAll("selected");
    setChecked(Object.fromEntries(selected.map((x) => [x, true])));
  }, [params, configDetails]);

  useEffect(() => {
    const selected = Object.keys(checked);
    setParams({ selected });
  }, [checked]);

  const handleClick = useCallback((idx) => {
    setChecked((checked) => {
      const obj = { ...checked };
      if (obj[idx]) {
        delete obj[idx];
      } else {
        obj[idx] = true;
      }
      return obj;
    });
  }, []);

  const handleShare = () => {
    const { href } = window.location;
    const copyString = `${href}`;
    if (window.isSecureContext) {
      navigator.clipboard.writeText(copyString).then(() => {
        toast("Copied to clipboard");
      });
    } else {
      toastError(
        "Unable to copy to clipboard due to lack of HTTPS. Please contact the system administrator about this issue."
      );
    }
  };

  const code = useMemo(
    () =>
      configDetails?.config && JSON.stringify(configDetails.config, null, 2),
    [configDetails]
  );

  // TODO(ciju): make this lazy. Only needed for IncidentCreate.
  const configLines = useMemo(() => code && code.split("\n"), [code]);

  const selectedCount = Object.keys(checked).length;

  const selectionControls =
    selectedCount > 0 ? (
      <div className="flex flex-row space-x-2">
        <div className="flex items-center mx-4">
          {selectedCount} lines selected
        </div>
        <Button
          className="btn-secondary"
          text="Clear"
          onClick={() => {
            setChecked({});
            return Promise.resolve();
          }}
        />
        <Button
          text="Share"
          onClick={() => {
            handleShare();
            return Promise.resolve();
          }}
        />
        <Button
          text="Create Incident"
          onClick={() => {
            setShowIncidentModal(true);
            return Promise.resolve();
          }}
        />
      </div>
    ) : null;

  useEffect(() => {
    setTabRight(selectionControls);
    return () => setTabRight(null);
  }, [checked]);

  return (
    <div className="flex flex-col items-start">
      <div className="flex flex-col w-full border rounded-md rounded-tl-none">
        {!isLoading ? (
          <JSONViewer
            code={code}
            showLineNo
            onClick={handleClick}
            selections={checked}
          />
        ) : (
          <div className="h-32 flex items-center justify-center">
            <Loading />
          </div>
        )}
      </div>

      <Modal
        open={showIncidentModal}
        onClose={() => setShowIncidentModal(false)}
        size="small"
        title="Create New Incident from Selected Evidence"
      >
        <IncidentCreate
          callback={(response) => {
            navigate(`/incidents/${response.id}`, { replace: true });
          }}
          evidence={{
            configId: id,
            configName: configDetails?.name,
            config: configLines,
            type: "config",
            lines: Object.fromEntries(
              Object.keys(checked).map((n) => [n, configLines[n]])
            )
          }}
        />
      </Modal>
    </div>
  );
}
