# Image Annotation Service

An image annotation service based on LitePipeline & LiteDFS

LitePipeline: https://github.com/fiefdx/LitePipeline

LiteDFS: https://github.com/fiefdx/LiteDFS

## Usage

The code is a LitePipeline application package

```bash
cd ./ImageAnnotationService

./clean.sh # clean package temp files & directories
# pack application as format as the LitePipeline servie config application format to be
./pack.sh zip # pack the package with .zip format
# or
./pack.sh tar.gz # pack the package with .tar.gz format

# upload the image_annotation_service.zip or image_annotation_service.tar.gz package to LitePipeline service
# run the application as a LitePipeline servie
```

## Input Data

```json
{
    "http_host": "0.0.0.0",
    "http_port": "6060",
    "ldfs_user": "user",
    "ldfs_password": "password",
    "cache_ttl": 3600,
    "cache_check_interval": 5
}
```
