import os
import tempfile
import kachery_cloud as kcl

def main():
    print('TESTING')
    site_uri = os.environ['SITE_URI']
    print(f'SITE URI: {site_uri}')
    with tempfile.TemporaryDirectory() as tmpdir:
        site_tgz_fname = tmpdir + '/site.tgz'
        if site_uri.startswith('sha1://'):
            kcl.load_file(site_uri, dest=site_tgz_fname)
            os.mkdir('site')
            os.system(f'tar -xzf {site_tgz_fname} -C site')
            os.system('ls site')
        else:
            raise Exception(f'Unsupported site URI: {site_uri}')

if __name__ == '__main__':
    main()
