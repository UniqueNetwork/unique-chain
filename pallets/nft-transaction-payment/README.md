# Nft Transaction Payment

## Overview

A module containing the sponsoring logic for paying for sponsored collections

**NOTE:** The scheduled calls will be dispatched with the default filter
for the origin: namely `frame_system::Config::BaseCallFilter` for all origin
except root which will get no filter. And not the filter contained in origin
use to call `fn schedule`.

If a call is scheduled using proxy or whatever mecanism which adds filter,
then those filter will not be used when dispatching the schedule call.
