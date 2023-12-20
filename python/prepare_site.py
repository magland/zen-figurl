import os
import tempfile
import requests
import boto3
import kachery_cloud as kcl

def main():
    print('TESTING')
    site_uri = os.environ['SITE_URI']
    kachery_zone = os.environ.get('KACHERY_ZONE', 'default')
    print(f'SITE URI: {site_uri}')
    with tempfile.TemporaryDirectory() as tmpdir:
        site_tgz_fname = tmpdir + '/site.tgz'
        site_dir = tmpdir + '/site'
        os.mkdir(site_dir)
        if site_uri.startswith('sha1://'):
            sha1 = site_uri[len('sha1://'):].split('?')[0]
            if len(sha1) != 40:
                raise Exception(f'Invalid site uri: {site_uri}')
            kcl.load_file(site_uri, dest=site_tgz_fname)
            object_key_base = f'zen-figurl-sites/kachery/{kachery_zone}/sha1/{sha1}'
        elif site_uri.startswith('https://zenodo.org/records/') or site_uri.startswith('https://sandbox.zenodo.org/records/'):
            a = site_uri.split('/')
            record_id = a[4]
            sandbox = site_uri.startswith('https://sandbox.zenodo.org/records/')
            if a[5] != 'files':
                raise Exception(f'Invalid site uri: {site_uri}')
            file_path = '/'.join(a[6:])
            _download_file(site_uri, dest=site_tgz_fname)
            object_key_base = f'zen-figurl-sites/{ "zenodo-sandbox" if sandbox else "zenodo" }/{record_id}/{file_path}'
        else:
            raise Exception(f'Unsupported site URI: {site_uri}')
        
        os.system(f'tar -xzf {site_tgz_fname} -C {site_dir}')
        # check to see if there is an index.html file in the site directory
        if os.path.exists(site_dir + '/index.html'):
            pass
        else:
            # otherwise, check for a single directory in the site directory
            dirs = [x for x in os.listdir(site_dir) if os.path.isdir(site_dir + '/' + x)]
            if len(dirs) == 0:
                raise Exception('No index.html file found in site directory and no directories found')
            elif len(dirs) > 1:
                raise Exception('No index.html file found in site directory and multiple directories found')
            else:
                site_dir = site_dir + '/' + dirs[0]
            # check for an index.html file in the site directory
            if not os.path.exists(site_dir + '/index.html'):
                raise Exception('No index.html file found in site directory')
        
        # upload everything in site_dir to the s3 cloud bucket
        s3 = boto3.client(
            's3',
            aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
            aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'],
            endpoint_url=os.environ['S3_ENDPOINT_URL'],
            region_name='auto' # for cloudflare
        )
        bucket = 'neurosift'
        for root, dirs, files in os.walk(site_dir):
            for fname in files:
                object_key = object_key_base + root[len(site_dir):] + '/' + fname
                print(f'Uploading {object_key}')
                _upload_file(s3=s3, bucket=bucket, object_key=object_key, fname=os.path.join(root, fname))

def _upload_file(s3, bucket, object_key, fname):
    if fname.endswith('.html'):
        content_type = 'text/html'
    elif fname.endswith('.js'):
        content_type = 'application/javascript'
    elif fname.endswith('.css'):
        content_type = 'text/css'
    elif fname.endswith('.png'):
        content_type = 'image/png'
    elif fname.endswith('.jpg'):
        content_type = 'image/jpeg'
    elif fname.endswith('.svg'):
        content_type = 'image/svg+xml'
    else:
        content_type = None
    extra_args = {}
    if content_type is not None:
        extra_args['ContentType'] = content_type
    s3.upload_file(fname, bucket, object_key, ExtraArgs=extra_args)

def _download_file(url: str, dest: str):
    print(f'Downloading {url} to {dest}')
    r = requests.get(url, stream=True)
    if r.status_code != 200:
        raise Exception(f'Problem downloading file: {url}')
    with open(dest, 'wb') as f:
        for chunk in r.iter_content(chunk_size=1024):
            if chunk:
                f.write(chunk)

if __name__ == '__main__':
    main()
