import { FunctionComponent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRoute } from '../route';
import './SitePage.css';

const SitePage: FunctionComponent = () => {
  const { route } = useRoute();
  if (route.page !== 'site') throw Error(`Unexpected page: ${route.page}`);

  const { siteUrl, validSiteUri } = useMemo(
    () => siteUriToSiteUrl(route.siteUri, route.kacheryZone),
    [route.siteUri, route.kacheryZone]
  );

  if (!validSiteUri)
    return (
      <div className="SitePage">
        <h1>Invalid site URI: {route.siteUri}</h1>
      </div>
    );

  if (!siteUrl) throw Error('Unexpected');

  return <SitePageInner siteUri={route.siteUri} siteUrl={siteUrl} />;
};

const useSiteFound = (siteUrl: string) => {
  const [siteFound, setSiteFound] = useState(false);
  useEffect(() => {
    // head request to see if site exists
    (async () => {
      try {
        const resp = await fetch(siteUrl + '/index.html', {
          method: 'HEAD',
        });
        if (resp.ok) {
          setSiteFound(true);
        } else {
          setSiteFound(false);
        }
      } catch (err) {
        setSiteFound(false);
      }
    })();
  }, [siteUrl]);
  return siteFound;
};

const SitePageInner: FunctionComponent<{ siteUri: string; siteUrl: string }> = ({ siteUrl }) => {
  const siteFound = useSiteFound(siteUrl);

  if (!siteFound) return <SiteNotFoundPage siteUrl={siteUrl} />;

  return (
    <div className="SitePage">
      <h1>Site Page</h1>
      <div>siteUrl: {siteUrl}</div>
    </div>
  );
};

const SiteNotFoundPage: FunctionComponent<{ siteUrl: string }> = ({ siteUrl }) => {
  const { route } = useRoute();
  if (route.page !== 'site') throw Error(`Unexpected page: ${route.page}`);

  const [buildSiteRequestStatus, setBuildSiteRequestStatus] = useState<'none' | 'error' | 'requesting' | 'requested'>(
    'none'
  );
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  const handleBuildSite = useCallback(() => {
    (async () => {
      setBuildSiteRequestStatus('requesting');
      let resp;
      console.log('--- 1');
      try {
        resp = await fetch(
          `/api/requestBuildSite?siteUri=${route.siteUri}&kacheryZone=${route.kacheryZone || 'default'}`
        );
        if (!resp.ok) {
          console.warn(`Problem requesting build site: ${resp.status} ${resp.statusText}`);
          setBuildSiteRequestStatus('error');
          setErrorMessage(`${resp.status} ${resp.statusText}`);
          return;
        }
        const obj = await resp.json();
        console.info(`Build site request: ${JSON.stringify(obj)}`);
        if (!obj.success) {
          setBuildSiteRequestStatus('error');
          setErrorMessage(obj.errorMessage);
          return;
        }
        setBuildSiteRequestStatus('requested');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        setBuildSiteRequestStatus('error');
        setErrorMessage(err.message);
        return;
      }
    })();
  }, [route.siteUri, route.kacheryZone]);

  return (
    <div className="SitePage">
      <h1>Site Not Found</h1>
      <table className="table1">
        <tbody>
          <tr>
            <td>URI</td>
            <td>{route.siteUri}</td>
          </tr>
          <tr>
            <td>URL</td>
            <td>{siteUrl}</td>
          </tr>
        </tbody>
      </table>
      <hr />
      {buildSiteRequestStatus === 'none' ? (
        <button onClick={handleBuildSite}>Build site</button>
      ) : buildSiteRequestStatus === 'requesting' ? (
        <div>Requesting build site...</div>
      ) : buildSiteRequestStatus === 'requested' ? (
        <div>Build site requested. Please only submit the request once. Check back in a few minutes.</div>
      ) : buildSiteRequestStatus === 'error' ? (
        <div>
          <div>Problem requesting build site</div>
          <div>{errorMessage}</div>
        </div>
      ) : (
        <div>Unexpected build site request status: {buildSiteRequestStatus}</div>
      )}
    </div>
  );
};

const siteUriToSiteUrl = (
  siteUri: string,
  kacheryZone: string | undefined
): { siteUrl?: string; validSiteUri: boolean } => {
  if (siteUri.startsWith('sha1://')) {
    const sha1 = siteUri.slice('sha1://'.length).split('?')[0];
    if (sha1.length !== 40) return { siteUrl: undefined, validSiteUri: false };
    return {
      siteUrl: `https://neurosift.org/zen-figurl-sites/kachery/${kacheryZone || 'default'}/sha1/${sha1}`,
      validSiteUri: true,
    };
  } else if (
    siteUri.startsWith('https://zenodo.org/records/') ||
    siteUri.startsWith('https://sandbox.zenodo.org/records/')
  ) {
    const a = siteUri.split('/');
    const recordId = a[4];
    const sandbox = siteUri.startsWith('https://sandbox.zenodo.org/records/');
    if (a[5] !== 'files') {
      return {
        siteUrl: undefined,
        validSiteUri: false,
      };
    }
    const filePath = a.slice(6).join('/');
    return {
      siteUrl: `https://neurosift.org/zen-figurl-sites/${
        sandbox ? 'zenodo-sandbox' : 'zenodo'
      }/${recordId}/${filePath}`,
      validSiteUri: true,
    };
  } else if (siteUri.startsWith('https://') || siteUri.startsWith('http://')) {
    return {
      siteUrl: siteUri,
      validSiteUri: true,
    };
  } else {
    return {
      siteUrl: undefined,
      validSiteUri: false,
    };
  }
};

export default SitePage;
