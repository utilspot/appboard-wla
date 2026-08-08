#include "config.h"

#include <libnetq/Library.h>
#include <libnetq/Path.h>
#include <libnetq/ErrorCode.h>
#include <libnetq/HttpHeader.h>
#include <libnetq/MediaType.h>
#include <libnetq/Module.h>
#include <libnetq/json/JSONWriter.h>
#include <libnetq/Array.h>
#include <libnetq/web/WebServer.h>
#include <libnetq/web/WebManifest.h>
#include <libnetq/web/WebRequest.h>
#include <libnetq/web/WebResponse.h>
#include <libnetq/Assert.h>

typedef struct WebAppboardExecutor WebAppboardExecutor;
struct WebAppboardExecutor {
  NQWebExecutor executor;
  NQWebManifestListeners manifestListeners;
  struct NQWebRequestListener appsListener;
};

static bool responseWriteJson(void* userdata, const char* characters, size_t size)
{
  NQWebResponse* response = (NQWebResponse*)userdata;
  int n = NQWebResponse_write(response, characters, size);
  return n < 0 ? false : true;
}

static int requestGeneralHandler(NQWebRequest* request, NQWebResponse* response)
{
  struct WebAppboardExecutor* appboard = (struct WebAppboardExecutor*)request->userdata;
  NQWebServer* server = NQWebRequest_server(request);

  NQWebResponse_setHeader(response, NQHTTP_HEADER_CONTENT_TYPE, NQ_MEDIATYPE_APPLICATION_JSON);

  NQJSONWriter writer;
  NQJSONWriter_init(&writer, responseWriteJson, response);

  NQJSONWriter_writeArrayBegin(&writer);
  NQListHead* iter = server->catalogEntries.next;
  while (iter != &server->catalogEntries) {
    struct NQWebCatalogEntry* entry = NQ_CONTAINER_OF(iter, struct NQWebCatalogEntry, serverList);
    if (NQStrcmp(entry->params.mainUrl, APPBOARD_ROOT_URL) != 0) {
      NQJSONWriter_writeObjectBegin(&writer);

      NQJSONWriter_writeKeyString(&writer, "main", entry->params.mainUrl);

      if (entry->params.title)
        NQJSONWriter_writeKeyString(&writer, "title", entry->params.title);
      if (entry->params.version)
        NQJSONWriter_writeKeyString(&writer, "version", entry->params.version);
      if (entry->params.description)
        NQJSONWriter_writeKeyString(&writer, "description", entry->params.description);

      if (entry->params.lightIconUrl)
        NQJSONWriter_writeKeyString(&writer, "icon", entry->params.lightIconUrl);
      else if (entry->params.darkIconUrl)
        NQJSONWriter_writeKeyString(&writer, "icon", entry->params.darkIconUrl);

      NQJSONWriter_writeObjectEnd(&writer);
    }
    iter = iter->next;
  }
  NQJSONWriter_writeArrayEnd(&writer);

  NQJSONWriter_finalize(&writer);
  return NQ_HTTP_OK;
}

static const NQWebRequestOperations kGeneralOps = {
  .handler = requestGeneralHandler,
};

static int executorInit(NQWebExecutor* executor, void* data)
{
  NQ_UNUSED_PARAM(data);

  struct WebAppboardExecutor* appboard = (struct WebAppboardExecutor*)executor;

  NQLibraryInfo info;
  int ret = NQLibraryInfoLoad(&info, &executorInit);
  if (ret != 0)
    return ret;

  NQPath* manifest = NQPath_join3(info.filename, "../../" APPBOARD_ASSETS_DIR, NQ_WEBMANIFEST_FILE);
  NQLibraryInfoFinalize(&info);
  if (manifest == NULL) {
    return -NQ_ENOMEM;
  }

  ret = NQWebManifestListenersInit(executor, &appboard->manifestListeners, NQPath_characters(manifest));
  NQPath_destroy(manifest);
  if (ret != 0) {
    return ret;
  }

  ret = NQWebExecutor_addRequestListener(&appboard->executor, &appboard->appsListener, &kGeneralOps, appboard, NQ_HTTP_GET, APPBOARD_SERVICE_URL);
  if (ret != 0) {
    NQWebManifestListenersFinalize(&appboard->executor, &appboard->manifestListeners);
    return ret;
  }

  return ret;
}

static void executorRelease(NQWebExecutor* executor)
{
  struct WebAppboardExecutor* appboard = (struct WebAppboardExecutor*)executor;
  NQWebExecutor_removeRequestListener(&appboard->executor, &appboard->appsListener);
  NQWebManifestListenersFinalize(&appboard->executor, &appboard->manifestListeners);
}

static struct NQWebExecutorOperations s_executorOps = {
  .name = "appboard",
  .init = executorInit,
  .release = executorRelease,
  .size = sizeof(struct WebAppboardExecutor),
};

static int moduleInit(NQContext* context)
{
  NQWebExecutorRegister(&s_executorOps);
  return 0;
}

static void moduleExit(NQContext* context)
{
  NQWebExecutorUnregister(&s_executorOps);
}

NQ_MODULE_INIT(moduleInit);
NQ_MODULE_EXIT(moduleExit);
