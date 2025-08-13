FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \
    cowsay \
    perl \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /usr/local/share/cows
COPY whale.cow /usr/local/share/cows/whale.cow

RUN echo '#!/bin/bash\n\
if [ "$1" = "cowsay" ]; then\n\
    shift\n\
    /usr/games/cowsay "$@"\n\
elif [ "$1" = "whalesay" ]; then\n\
    shift\n\
    /usr/games/cowsay -f /usr/local/share/cows/whale.cow "$@"\n\
else\n\
    echo "Usage: docker run --rm my-cowsay <cowsay|whalesay> \"message\""\n\
    exit 1\n\
fi' > /entrypoint.sh \
    && chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]