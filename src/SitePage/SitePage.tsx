import { FunctionComponent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRoute } from '../route';
import './SitePage.css';
import { useWindowDimensions } from '@fi-sci/misc'

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
    <SiteIframe
      siteUrl={siteUrl}
    />
  );
};

const SiteIframe: FunctionComponent<{ siteUrl: string }> = ({ siteUrl }) => {
  const {width, height} = useWindowDimensions();
  return (
    <iframe
      src={siteUrl + '/index.html'}
      style={{ width: width, height: height }}
      title="site"
    />
  )
}

const SiteNotFoundPage: FunctionComponent<{ siteUrl: string }> = ({ siteUrl }) => {
  const { route } = useRoute();
  if (route.page !== 'site') throw Error(`Unexpected page: ${route.page}`);

  const [prepareSiteRequestStatus, setPrepareSiteRequestStatus] = useState<'none' | 'error' | 'requesting' | 'requested'>(
    'none'
  );
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  const handlePrepareSite = useCallback(() => {
    (async () => {
      setPrepareSiteRequestStatus('requesting');
      let resp;
      try {
        resp = await fetch(
          `/api/requestPrepareSite?siteUri=${route.siteUri}&kacheryZone=${route.kacheryZone || 'default'}`
        );
        if (!resp.ok) {
          console.warn(`Problem requesting prepare site: ${resp.status} ${resp.statusText}`);
          setPrepareSiteRequestStatus('error');
          setErrorMessage(`${resp.status} ${resp.statusText}`);
          return;
        }
        const obj = await resp.json();
        if (!obj.success) {
          setPrepareSiteRequestStatus('error');
          setErrorMessage(obj.errorMessage);
          return;
        }
        setPrepareSiteRequestStatus('requested');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        setPrepareSiteRequestStatus('error');
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
        </tbody>
      </table>
      <hr />
      <p>
        This site is not yet available. You can request that it be prepared. This will usually take a few minutes. Please only submit the request once.
      </p>
      {prepareSiteRequestStatus === 'none' ? (
        <button onClick={handlePrepareSite}>Prepare site</button>
      ) : prepareSiteRequestStatus === 'requesting' ? (
        <div>Requesting prepare site...</div>
      ) : prepareSiteRequestStatus === 'requested' ? (
        <div style={{color: 'darkgreen'}}>Prepare site requested. Please only submit the request once. Check back in a few minutes.</div>
      ) : prepareSiteRequestStatus === 'error' ? (
        <div>
          <div>Problem requesting prepare site</div>
          <div>{errorMessage}</div>
        </div>
      ) : (
        <div>Unexpected prepare site request status: {prepareSiteRequestStatus}</div>
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
    siteUri.startsWith('zenodo://') ||
    siteUri.startsWith('zenodo-sandbox://')
  ) {
    const a = siteUri.split('/');
    const recordId = a[2];
    const sandbox = siteUri.startsWith('zenodo-sandbox://');
    const filePath = a.slice(3).join('/');
    return {
      siteUrl: `https://neurosift.org/zen-figurl-sites/${
        sandbox ? 'zenodo-sandbox' : 'zenodo'
      }/${recordId}/${filePath}`,
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
